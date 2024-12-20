
var request = require('v9u-smb2/lib/tools/smb2-forge').request;

module.exports = function queryDirectory(path,cb) {
    var connection = this;
    request('open_folder', { path: path }, connection, function(
        err,
        file
    ) {
        if (err)
        {   console.log("当前文件信息",file)
            console.log("当前的err有：",err)
        }
        else
            request('query_directory', { FileId: path }, connection, function(err, file) {
            if (err != null) {
                console.log("当前的err2有：",err)
                return cb(err);
            }

            request('close', file, connection, function() {
                console.log("当前文件信息",file)
                cb(null,null);
            });
        });
    });


};
