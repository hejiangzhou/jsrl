#!/bin/bash
./jspp jsutils.js -DDEBUG -include preproc.jsh > err/jsutils.js
./jspp jsrl.js -DDEBUG -include preproc.jsh > err/jsrl.js

./jspp jsutils.js -DNDEBUG -include preproc.jsh > test/jsutils.js
./jspp jsrl.js -DNDEBUG -include preproc.jsh > test/jsrl.js

cp err/jsutils.js test_debug/
cp err/jsrl.js test_debug/
