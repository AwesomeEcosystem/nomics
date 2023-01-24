# Getting Started with Lisk Blockchain Client

This project was bootstrapped with [Lisk SDK](https://github.com/LiskHQ/lisk-sdk)

### Start a node

```
./bin/run start
```

### Add a new module

```
lisk generate:module ModuleName ModuleID
// Example
lisk generate:module token 1
```

### Add a new asset

```
lisk generate:asset ModuleName AssetName AssetID
// Example
lisk generate:asset token transfer 1
```

### Add a new plugin

```
lisk generate:plugin PluginAlias
// Example
lisk generate:plugin httpAPI
```

## Learn More

You can learn more in the [documentation](https://lisk.io/documentation/lisk-sdk/index.html).

1. you create a folder for your app
2. lisk init there
3. ./bin/run genesis-block:create --validators 3 --accounts 2 --token-distribution 200000000000 --output config/default
4. tmp=$(mktemp)
jq '.forging.delegates = input' config/default/config.json config/default/forging_info.json > "$tmp" && mv "$tmp" config/default/config.json
jq '.forging += input' config/default/config.json config/default/password.json > "$tmp" && mv "$tmp" config/default/config.json

5. rm -r ~/.lisk/nomics

6. ./bin/run start
