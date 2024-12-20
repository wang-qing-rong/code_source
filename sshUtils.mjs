import {Client} from "ssh2"

const conn = new Client();


const connectParams = {
  host: '192.168.10.224',
  port: 22,
  username: 'root',
  password: "singstor.com",
}

/**
 * 判断rsync是否安装
 */
export function isRsyncInstall() {
  return new Promise((resolve, reject) => {
    conn.on('ready', () => {
      let cmd = 'rsync --version | grep version';
      // let cmd = "cat /etc/rsyncd.conf"
      conn.exec(cmd, (err, stream) => {
        if (err) return reject({code: 2, msg: `执行cmd: ${cmd} 出错！！`})
        stream.on('close', (code, signal) => {
          conn.end();
          if (code !== 0) {
            return reject({code: 2, msg: `执行cmd: ${cmd} 出错！！`})
          }
        }).on('data', (data) => {
          return resolve({code: 200, msg: data.toString().trim()})
        })
      });
    }).on('error', (err) => {
      return reject({code: 1, msg: err.toString().trim()})
    }).connect(connectParams);
  })
}

export function remotePathExists(path) {
  return new Promise((resolve, reject) => {
    conn.on('ready', () => {
      let cmd = `test -e ${path} && echo 1 || echo 0`;
      conn.exec(cmd, (err, stream) => {
        if (err) return reject({code: 2, msg: `执行cmd: ${cmd} 出错！！`})
        stream.on('close', (code, signal) => {
          conn.end();
          if (code !== 0) {
            return reject({code: 2, msg: `执行cmd: ${cmd} 出错！！`})
          }
        }).on('data', (data) => {
          return resolve(data.toString().trim() === '1')
        })
      });
    }).on('error', (err) => {
      return reject({code: 1, msg: err.toString()})
    }).connect(connectParams);
  })
}

const rsyncdConfigPath = "/etc/rsyncd.conf"


/**
 * 读取 rsync中配置文件的信息
 * @return {Promise<unknown>}
 */
export async function catRsyncdConfig(configPath) {
  try {
    return new Promise((resolve, reject) => {
      let data = "";
      conn.on('ready', async () => {
        // 判断路径是否存在
        if (!await new Promise((partResolve, partReject) => {
          let existsCmd = `test -e ${configPath} && echo 1 || echo 0`;
          conn.exec(existsCmd, (err, stream) => {
            stream.on("data", (data) => {
              return partResolve(data.toString().trim() === "1")
            })
          })
        })) {
          return resolve({code: 5, msg: `${configPath} 路径不存在！！`})
        }
        let cmd = `cat ${configPath}`;
        conn.exec(cmd, (err, stream) => {
          if (err) {
            console.log(err)
            return reject({code: 2, msg: `执行cmd: ${cmd} 出错！！`});
          }
          stream.on("data", (chunk) => {
            data += chunk;
          })
          stream.on('close', (code, signal) => {
            conn.end();
            if (code !== 0) {
              return reject({code: 2, msg: `执行cmd: ${cmd} 异常！！`});
            } else {
              return resolve({code: 200, msg: data.toString()})
            }
          })
        });
      }).on('error', (err) => {
        reject({code: 1, msg: err.toString()});
      }).connect(connectParams);
    });

  } catch (error) {
    console.error("发生错误:", error);
    throw error; // 将错误抛出，以便上层函数处理
  }
}

catRsyncdConfig(rsyncdConfigPath).then((res) => {
  console.log(res)
}).catch(error => {
  console.log(error)
})

// let a = await isRsyncInstall()
// console.log(a)