/**
 * windows系统执行挂载的工具类
 */
/*eslint-disable*/
import {exec, spawn} from 'child_process';
import networkDrive from 'windows-network-drive';
import iconv from 'iconv-lite';
import path from "path";


const letters = ['Z:', 'Y:', 'X:', 'W:', 'V:', 'U:', 'T:', 'S:', 'R:', 'Q:', 'P:', 'O:', 'N:', 'M:', 'L:', 'K:', 'J:', 'I:', 'H:', 'G:', 'F:', 'E:', 'D:', 'C:', 'B:', 'A:'];

export class MountResult {
  constructor() {
    this.mountStatus = 0;          // 0 未挂载 1 挂载成功 2 已挂载  3 挂载异常 4 挂载失败
    this.ip = '';
    this.shareName = '';
    this.driveLetter = '';         // 挂载的盘符
    this.errorTxt = 0;             // 错误信息
  }
}

/**
 * 执行单个windows的挂载命令
 * @param ip
 * @param userNo
 * @param pwd
 * @param shareName
 * @return {Promise<void>}
 */
export function winMountExecute(ip, userNo, pwd, shareName) {
  return new Promise(async (resolve, reject) => {
    const mountResult = new MountResult();
    try {
      mountResult.ip = ip;
      mountResult.shareName = shareName;
      const localDriveLst = await getLocalDrivesList()
      let exitFlag = false
      // 首先判断该共享目录是否已经存在挂载
      await getMountStatus(localDriveLst, ip, shareName, mountResult);
      if (mountResult.mountStatus === 1) {
        resolve(mountResult)
        return
      }
      for (let j = 0; j < letters.length; j++) {
        if (!localDriveLst.includes(letters[j])) {
          //执行 'net use' 命令来挂载盘符
          exitFlag = await winLocalCmdExecuteMount(letters[j], ip, userNo, pwd, shareName)
          mountResult.mountStatus = 1
          mountResult.driveLetter = letters[j]
        }
        if (exitFlag) {
          resolve(mountResult)
        }
      }
      //   返回一个挂载状态
    } catch (error) {
      // error 不允许不同用户连接到同一服务器或共享  类型 Multiple connections to a server or shared resource by the same user, using more than one user name, are not allowed. Disconnect all previous connections to the server or shared resource and try again.
      mountResult.mountStatus = 3;
      mountResult.errorTxt = error.toString().trim().split(/\s+/)
      reject(mountResult)
    }
  });
}

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.log(`Error: ${stderr}`);
        return reject(error);
      }
      resolve(stdout);
    });
  });
}


/**
 *
 * @param letter
 * @param ip
 * @param userNo
 * @param pwd
 * @param shareName
 */
export function winLocalCmdExecuteMount(letter, ip, userNo, pwd, shareName) {
  return new Promise((resolve, reject) => {
    let cmd = `chcp 65001 && net use ${letter} \\\\${ip}\\${shareName} /User:${userNo} /P:Yes`
    const child = exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.log("-->", err.toString());
        return reject(err);
      }
      child.stdin.write(pwd + "\n")
      child.stdin.end()
    });
    // console.log("pwd==>",pwd);
    // child.stdin.write(pwd + "\n");
    // child.stdin.end();
    // exec(cmd +" /savecred",(error, stdout, stderr)=>{
    //   if (error){
    //     console.log(error.toString())
    //     return reject(error)
    //   }
    // })
    resolve("success");
  });
}

export function winUnmountExecute() {

}

/**
 * 获取本地的全部盘符
 * @return {Promise<unknown>}
 */
export function getLocalDrivesList() {
  return new Promise((resolve, reject) => {
    exec('wmic logicaldisk get caption', (err, stdout, stderr) => {
      if (err) {
        return reject(err);
      }
      const drives = stdout.trim().split(/\s+/).slice(1);
      resolve(drives);
    });
  });
}


/**
 * 获取该共享目录是否成功挂载
 * @param letters
 * @param ipAddress
 * @param shareName
 * @Param mountResult
 * @return {Promise<unknown>}
 */
export function getMountStatus(letters, ipAddress, shareName, mountResult) {
  return new Promise((resolve, reject) => {
    // 判断该共享是否存在
    exec('chcp 65001 && net use | findstr /C:"\\\\\\\\' + ipAddress + '\\\\' + shareName + '"', {encoding: 'buffer'}, (err, stdout, stderr) => {
      if (err) {
        mountResult.mountStatus = 3
        resolve(mountResult)
        return
      }
      // 如果 stdout 是 UTF-8，使用 iconv-lite 将 Buffer 转换为 UTF-8 编码的字符串
      const drives = iconv.decode(Buffer.from(stdout), 'gbk').trim().split(/\s+/).slice(1);
      for (let i = 0; i < drives.length; i++) {
        if (drives[i] === 'Unavailable') {
          mountResult.mountStatus = 4;
          resolve(mountResult)
          return;
        }
        if (drives[i] === "OK") {
          mountResult.mountStatus = 1;
        }
        if (letters.includes(drives[i])) {
          mountResult.driveLetter = drives[i];
        }
      }
      resolve(mountResult);
    });
  });
}


/**
 * 删除端口转发
 */
export function deletePortproxy(remoteIp, remotePort) {
  return new Promise(async (resolve, reject) => {
    // 检查是否存在转发
    let portproxy = await getPortproxy(remoteIp, remotePort)
    if (!portproxy) {
      resolve(true)
      return
    }
    let args = `-command \"netsh interface portproxy delete v4tov4 listenport=${portproxy.listenPort} listenaddress=${portproxy.listenAddress}\"`;
    let cmd = `powershell -Command "Start-Process powershell -ArgumentList 'netsh interface portproxy delete v4tov4 listenport=${portproxy.listenPort} listenaddress=${portproxy.listenAddress}' -Verb RunAs"`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.log("Error ", error);
        resolve(false)
        return
      }
      resolve(true)
    })
  })
}


/**
 * 执行端口转发
 * @param remoteIp
 * @param remotePort
 * @return {Promise<unknown>}
 */
export function executePortproxy(remoteIp, remotePort) {
  return new Promise(async (resolve, reject) => {
    //   已经存在的情况
    let portproxy = await getPortproxy(remoteIp, remotePort)
    if (portproxy) {
      resolve(true)
      return
    }
    let cmd = `powershell -Command "Start-Process powershell -ArgumentList 'netsh interface portproxy add v4tov4 listenport=445 listenaddress=127.0.0.1 connectport=${remotePort} connectaddress=${remoteIp}' -Verb RunAs"`
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.log("Error ", error);
        resolve(false)
        return
      }
      resolve(true)
    })
  })
}


/**
 * 获取当前映射的信息
 * @param remoteIp
 * @param remotePort
 */
export function getPortproxy(remoteIp, remotePort) {
  return new Promise((resolve, reject) => {
    const portproxy = {
      listenAddress: "",
      listenPort: "",
      connectAddress: "",
      connectPort: ""
    }

    exec(`netsh interface portproxy show all | findstr "${remoteIp}" | findstr "${remotePort}"`, (error, stdout, stderr) => {
      if (error) {
        resolve(null)
        return
      }
      let stdoutList = stdout.trim().split(/\s+/);
      if (stdoutList.length === 4) {
        portproxy.listenAddress = stdoutList[0];
        portproxy.listenPort = stdoutList[1];
        portproxy.connectAddress = stdoutList[2];
        portproxy.connectPort = stdoutList[3];
        resolve(portproxy);
      }
      resolve(null)
    })
  })
}


export function isVoucher(targetIp, targetUser) {
  return new Promise((resolve, reject) => {
    let cmd = `chcp 65001 && cmdkey /list:${targetIp}`
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        return resolve(true);
      }
      let target = `Target: ${targetIp}`;
      let type = `Type: Domain Password`
      let user = `User: ${targetUser}`
      let stdoutList = stdout.trim().split('\n').splice(1).map(item => item.trim());
      let targetIndex = stdoutList.indexOf(target);
      console.log(stdoutList)
      if (targetIndex !== -1) stdoutList = stdoutList.slice(targetIndex, targetIndex + 3);
      targetIndex = stdoutList.indexOf(target);
      let typeIndex = stdoutList.indexOf(type);
      let userIndex = stdoutList.indexOf(user);
      if (typeIndex + 1 < stdoutList.length) {
        if (stdoutList[typeIndex + 1].includes(":")) {
          targetUser = stdoutList[typeIndex + 1].split(':')[1]
        }else{
          targetUser = null
        }
      } else {
        targetUser = null
      }
      console.log("targetIndex",targetIndex);
      console.log("typeIndex",typeIndex);
      console.log("userIndex",userIndex);
      return (targetIndex + 1 === typeIndex) && (userIndex === -1) ? reject(targetUser) : resolve(true);
    })
  })
}

// isVoucher('192.168.10.224','w11').then(res=>{
//   console.log("res--->",res);
// }).catch(targetUser=>{
//   console.log("targetUser",targetUser);
// })

