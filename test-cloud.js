// Cloud deployment test script
import fetch from 'node-fetch';

async function testDeployment({supabaseUrl, serviceRoleKey}){
  const url = `${supabaseUrl}/functions/v1/health`;
  const res = await fetch(url, {
    headers: {Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey}
  });
  console.log('health', res.status);
}

export default testDeployment;
