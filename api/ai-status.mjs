export default function handler(req,res){
  try{
    if(req.method!=='GET'){
      res.setHeader('Allow','GET');
      return res.status(405).json({error:'Method not allowed'});
    }
    const configured=Boolean(process.env.AI_API_KEY&&process.env.AI_MODEL);
    return res.status(200).json({
      mode:process.env.AI_MODE==='live'&&configured?'live':'mock',
      configured,
      ...(process.env.AI_MODEL?{model:process.env.AI_MODEL}:{})
    });
  }catch(error){
    console.error('[ai-status]',error instanceof Error?error.name:'Error',error instanceof Error?error.message:'Unknown error');
    return res.status(200).json({mode:'mock',configured:false});
  }
}
