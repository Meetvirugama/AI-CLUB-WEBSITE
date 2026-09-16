const fs = require('fs');
const path = require('path');
const glob = require('glob');

// This script requires glob, which might not be installed globally, so let's use a simpler node script without glob if possible, or we can just use python since it's available.
