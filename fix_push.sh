#!/bin/bash
cd /home/guy/Desktop/buildcheap-expo-starter
TOKEN=$(gh auth token)
git remote set-url origin "https://x-access-token:${TOKEN}@github.com/chronosdev-web/buildcheap-expo-starter.git"
git push -u origin main
echo "Repository synced perfectly!"
