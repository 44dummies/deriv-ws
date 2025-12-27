#!/bin/bash

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting repository sync...${NC}"

# 1. Push everything to origin (deriv-ws)
echo -e "\n${YELLOW}Step 1: Pushing to origin (deriv-ws)...${NC}"
if git push origin main; then
    echo -e "${GREEN}✓ Successfully pushed to origin${NC}"
else
    echo -e "${RED}✗ Failed to push to origin${NC}"
    exit 1
fi

# 2. Push server directory to tradermind-server
echo -e "\n${YELLOW}Step 2: Pushing server subtree to tradermind-server...${NC}"
# Check if remote exists
if ! git remote | grep -q "tradermind-server"; then
    echo -e "${RED}Error: Remote 'tradermind-server' not found.${NC}"
    echo "Please add it using: git remote add tradermind-server <url>"
    exit 1
fi

if git subtree push --prefix server tradermind-server main; then
    echo -e "${GREEN}✓ Successfully pushed server subtree to tradermind-server${NC}"
else
    echo -e "${RED}✗ Failed to push to tradermind-server${NC}"
    exit 1
fi

echo -e "\n${GREEN}All repositories synced successfully! 🚀${NC}"
