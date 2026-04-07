#!/bin/bash
cd /home/guy/Desktop/buildcheap-expo-starter
git init -b main
git config user.name "Guy"
git config user.email "guy@chronos.dev"
git add .
git commit -m "chore: scaffold BuildCheap Expo Starter template"
gh repo create buildcheap-expo-starter --public --source=. --remote=origin --push
