    Shiterator = function(callback, options) {        this.__callback = callback || noop;        this._options = merge({            host: null,            port: 6060,            postingPeriod: 1,          // in seconds            forgetErrorsAfter: 0,       // in days, 0 means "1 year"            errorsLimit: 10        }, options);        this.__ShiteratorInit();    };    Shiterator.prototype.__ShiteratorInit = function() {        this.__started = false;        this.__errorsToPost = [];        this.__knownErrors = new ErrorStorage(this._options.forgetErrorsAfter || 365);        this.__errorsCount = 0;        this.__postErrorTimeout = null;        this.__url = this.__getFullUrl();        this.__form = null;        new ErrorHandler(this.__errorHandler, this);    };    Shiterator.prototype.__getFullUrl = function() {        if (this._options.host) {            return (this._options.host.indexOf('http://') !== 0 ? 'http://' : '') +                    this._options.host +                   (this._options.port ? ':' + this._options.port : '');        }        return null;    };    Shiterator.prototype.__convertErrorToData = function(message, file, line) {        return {            'type'      : 'javascript',            'subject'   : message + ' on ' + file + ':' + line,            'message'   : message,            'line'      : line,            'stack'     : 'not available',            'tracker'   : {},            'file'      : file,            'custom'    : {                'url'      : document.location.href,                'referer'  : document.referrer            }        };    };    Shiterator.prototype.__errorHandler = function(message, file, line) {        if (!this.__started ||            this.__errorsCount >= this._options.errorsLimit) {            return;        }        var id = foldString(message + ' on ' + file + ':' + line, 4);        var self = this;        var error = this.__convertErrorToData(message, file, line);        if (!this.__knownErrors.has(id)) {            this.__callback.call(window, error);            this.__knownErrors.put(id);            this.__errorsToPost.push(error);            this.__errorsCount++;            if (!this.__postErrorTimeout) {                this.__postErrorTimeout = setTimeout(function() {                    self.__submitErrors();                }, this._options.postingPeriod * 1000);            }        }    };    Shiterator.prototype.__submitErrors = function() {        if (!this.__url) {            return;        }        if (!this.__form) {            // create form & iframe            var box = document.createElement('div');            box.style.display = 'none';            box.innerHTML = '<form action="' + this.__url + '" method="post" target="shiterator-error-frame" name="shiterator-form">' +                            "<input type='hidden' name='errors' value=''>" +                            '</form>' +                            '<iframe id="shiterator-error-frame" name="shiterator-error-frame"></iframe>';            document.body.appendChild(box);            this.__form = box.getElementsByTagName('form')[0];        }        var iframe = box.getElementsByTagName('iframe')[0];        var input = box.getElementsByTagName('input')[0];        var JSONString = JSONToString(this.__errorsToPost);        input.setAttribute('value', JSONString);        iframe.onload = function() {            iframe.onload = null;            self.stop();        };        this.__form.submit();    };    Shiterator.prototype.start = function () {        this.__started = true;    };    Shiterator.prototype.stop = function () {        if (this.__started) {            this.__errorsToPost.length = 0;            this.__errorsCount = 0;            this.__started = false;            clearTimeout(this.__postErrorTimeout);        }    };