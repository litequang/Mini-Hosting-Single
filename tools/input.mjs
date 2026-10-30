import readline from 'node:readline';
export async function ask(prompt,{secret=false}={}){
 if(!process.stdin.isTTY||!process.stdout.isTTY)throw Error('INTERACTIVE_TERMINAL_REQUIRED');
 const rl=readline.createInterface({input:process.stdin,output:process.stdout,terminal:true});
 if(secret){process.stdout.write(prompt);rl._writeToOutput=()=>{};}
 try{return await new Promise((resolve,reject)=>{rl.once('SIGINT',()=>reject(Error('CANCELLED')));rl.question(secret?'':prompt,resolve);});}finally{rl.close();if(secret)process.stdout.write('\n');}
}
