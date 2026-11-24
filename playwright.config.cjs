const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:'./e2e',use:{baseURL:process.env.RIFT_TEST_URL||'http://127.0.0.1:8080',launchOptions:process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}},workers:1});
