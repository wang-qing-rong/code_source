const fs=require('fs')
const dir='D:\\projects\\others\\nodejs\\v9u\\v9u-smb2\\lib\\structures'
fs.readdir(dir,(err,files)=>{
	console.log('files:',files)
})


 [ 'close',require('../structures/close')],
 [ 'constants',require('../structures/constants')],      
 [ 'create',require('../structures/create')],
 [ 'negotiate',require('../structures/negotiate')],      
 [ 'query_directory',require('../structures/query_directory')],
 [ 'read',require('../structures/read')],
 [ 'session_setup',require('../structures/session_setup')],  
 [ 'set_info',require('../structures/set_info')],       
 [ 'tree_connect',require('../structures/tree_connect')],   
 [ 'write',require('../structures/write')]