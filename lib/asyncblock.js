var GeneratorFlow = require('./flow_generator.js').GeneratorFlow;
var transform = require('./transform.js');

var asyncblock = function(fn, done, options) {
    if(options == null){
        options = {};
    }

    if(fn && fn.constructor && fn.constructor.name === 'GeneratorFunction'){
        return handleGenerator(fn, done, options);
    } else {
        throw new Error('The function passed to asyncblock is not a generator function. (Missing the *)');
    }
};

module.exports = function(fn, done, options){
    //Capture stack trace by default
    var err = new Error();
    //Currently not capturing stack trace as it's about 60% slower than just making the error (and just takes 1 frame off stack trace)
    //Error.captureStackTrace(err, module.exports);

    if(options == null){
        options = {};
    }

    options.stack = err;

    asyncblock(fn, done, options);
};

module.exports.enableTransform = function(mod){
    var notEnabled = transform.enableTransform();

    if(notEnabled && mod){
        delete require.cache[mod.filename];
        mod.exports = require(mod.filename);
    }

    return notEnabled;
};

module.exports.compileContents = transform.compileContents;

module.exports.fullstack = module.exports;

module.exports.nostack = function(fn, done){
    asyncblock(fn, done);
};

//Creates a callback handler which only calls its callback in the case of an error
//This is just some sugar provided for a case like this:
//app.get('/handler', function(req, res, next) {
//  asyncblock(function(){
//    //do stuff here
//  }, asyncblock.ifError(next)); //Only calls next if an error is thrown / returned
//});
module.exports.ifError = function(callback){
    return function(err){
        if(err != null){
            callback.apply(this, arguments);
        }
    };
};

var handleGenerator = function(genfun, done, options){
    var flow = new GeneratorFlow();
    flow._generator = genfun(flow);
    flow._done = done;
    flow._nostack = options.nostack;

    flow.errorCallback = done;

    try {
        flow._start();
    } catch(e){
        flow._errorHandler(e);
    }
};

var _generatorsSupported;
module.exports.areGeneratorsSupported = function(){
    if(_generatorsSupported == null){
        try{
            eval('(function*(){})');
            _generatorsSupported = true;
        } catch(e){
            _generatorsSupported = false;
        }
    }

    return _generatorsSupported;
};

module.exports.Flow = require('./flow.js').Flow;