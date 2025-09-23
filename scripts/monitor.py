# Monitoring and health checks
import requests

def check_scraping_health(supabase_url, service_role_key):
    headers = {"apikey": service_role_key, "Authorization": f"Bearer {service_role_key}"}
    res = requests.get(f"{supabase_url}/functions/v1/health", headers=headers)
    return res.status_code, res.text

if __name__ == '__main__':
    print('Use check_scraping_health(supabase_url, service_role_key)')
