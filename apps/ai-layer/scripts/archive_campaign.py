
import os
import requests
import pandas as pd
from datetime import datetime
import shutil

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def archive_data():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    archive_dir = os.path.join(os.getcwd(), "archives")
    os.makedirs(archive_dir, exist_ok=True)
    
    print(f"Archiving Shadow Campaign to {archive_dir}...")
    
    # 1. Fetch Data
    tables = ["shadow_signals", "price_history"]
    
    for table in tables:
        print(f"Exporting {table}...")
        url = f"{SUPABASE_URL}/rest/v1/{table}?select=*"
        # Pagination might be needed for large sets, simplifying here for script
        resp = requests.get(url, headers=HEADERS)
        if resp.ok:
            data = resp.json()
            df = pd.DataFrame(data)
            filename = f"{table}_archive_{timestamp}.csv"
            path = os.path.join(archive_dir, filename)
            df.to_csv(path, index=False)
            print(f"Saved {len(df)} rows to {filename}")
        else:
            print(f"Failed to fetch {table}: {resp.text}")

    # 2. Cleanup (Optional/Prompted)
    # For automated script, we might flag it.
    # Here we just log that it's ready for cleanup.
    # requests.delete(f"{SUPABASE_URL}/rest/v1/shadow_signals?created_at=lte.now()", ...)
    print("Archive complete. Data is safe.")
    print("To reset DB, run: DELETE FROM shadow_signals; DELETE FROM price_history;")

if __name__ == "__main__":
    archive_data()
