## Features
- All features for CA3 part A are implemented.
- Only Login/Register page have CSS
- Side Note: **Emojis take about 5 seconds to fetch the first time**

## Emoji API key
- to be able to use emojis, you have to create an .env file
- inside the file should contain: 
```
EMOJI_API_KEY={YOUR_EMOJI_API_KEY}
```
- where {YOUR_EMOJI_API_KEY}, is your emoji API key 

## Dependencies
- MAKE SURE TO HAVE pkg-config downloaded to use canvas package. On mac run on terminal:
```
$ brew install pkg-config
```
- To confirm you have it installed. Run on terminal:
```
$ pkg-config --version
```
- run npm ci on terminal to get all dependencies
```
$ npm ci
```

## Running the website
- type in terminal
```
$ node server.js
```
- terminal should tell you what port number (3000) it is using
- on browser type
```
localhost:3000
```
- port should be 3000 but if it is somehow different, go with the one on the terminal
