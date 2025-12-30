
import os
import json
import requests
from datetime import datetime

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def approve_threshold():
    print("Initiating Approval Process...")

    # 1. Load Proposal
    try:
        with open("threshold_proposal.json", "r") as f:
            proposal = json.load(f)
    except FileNotFoundError:
        print("❌ Error: threshold_proposal.json not found.")
        return

    # 2. Load Validation
    try:
        with open("replay_validation.json", "r") as f:
            validation = json.load(f)
    except FileNotFoundError:
        print("❌ Error: replay_validation.json not found. You must validate before approving.")
        return

    # 3. Validation Checks
    print(f"Prop Version: {proposal.get('version')}")
    print(f"Val Version:  {validation.get('proposal_ver')}")

    if proposal.get('version') != validation.get('proposal_ver'):
        print("❌ Mismatch: Validation file is for a different proposal.")
        return

    if not validation.get('passed'):
        print("❌ Denied: Logic Replay PASSED check failed.")
        print("Reasons: " + str(validation.get('reasons')))
        return

    # 4. Human Sign-off
    approver = os.environ.get("APPROVER_NAME")
    if not approver:
        approver = input("Enter Approver Name (Sign-off): ")
    
    if not approver:
        print("❌ Approval aborted: No signature.")
        return

    print(f"✅ Replay Passed. Max DD: {validation['simulated']['max_drawdown']}")
    confirm = input("Type 'APPROVE' to commit this version to Database: ")
    if confirm != "APPROVE":
        print("Cancelled.")
        return

    # 5. Commit to DB
    payload = {
        "version": proposal['version'],
        "strategy": "adaptive_v1", # Could come from proposal
        "regime": "ALL",
        "config": proposal['config'],
        "is_active": False, # Day 6 handles activation
        "created_at": datetime.now().isoformat()
    }
    
    # We might want to store metadata about approval in a separate column or in config?
    # Schema doesn't have approval_meta, we can put it in config or ignore for now.
    payload['config']['_meta'] = {
        "approved_by": approver,
        "replay_stats": validation['simulated']
    }

    url = f"{SUPABASE_URL}/rest/v1/threshold_versions"
    resp = requests.post(url, headers=HEADERS, json=payload)
    
    if resp.status_code in [200, 201]:
        print(f"✅ success! Version {proposal['version']} stored in DB.")
        print("Status: INACTIVE (Pending Activation)")
    else:
        print(f"❌ DB Error: {resp.text}")

if __name__ == "__main__":
    approve_threshold()
