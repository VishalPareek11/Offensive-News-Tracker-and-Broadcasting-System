const { profanity } = require("allprofanity");

const text = "What the f#ck is this?";

const result = profanity.check(text);

console.log("Offensive:", result);