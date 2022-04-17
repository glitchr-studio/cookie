(function (root, factory) {

    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.CookieConsent = factory();
    }

})(this, function () {

    var CookieConsent = {};
        CookieConsent.version = '0.1.0';

    var Settings = CookieConsent.settings = {
        "groupnames" : ["necessary", "analytical", "marketing"],
    };

    var debug = false;
    var ready = false;

    CookieConsent.reset = function(el = undefined) {

        var targetData = jQuery.data(el || document.documentElement);
        Object.keys(targetData).forEach((key) => delete targetData[key]);
        
        $(window).off("cookie-consent");
        return this;
    }

    CookieConsent.ready = function (options = {})
    {
        if("debug" in options)
            debug = options["debug"];

        CookieConsent.configure(options);
        ready = true;

        if (debug) console.log("CookieConsent is ready.");
        dispatchEvent(new Event('cookie-consent:ready'));

        CookieConsent.refresh();
        return this;
    };

    CookieConsent.getNConfirmedConsents = function(groupname = undefined) { return this.getNConsents(groupname, true ); }
    CookieConsent.getNDeniedConsents    = function(groupname = undefined) { return this.getNConsents(groupname, false); }
    CookieConsent.getNConsents          = function(groupname = undefined, value = null) 
    {
        var N = 0;
        value = value != null ? Boolean(value) : null;
        
        this.get("groupnames").forEach(function (_groupname) {

            if(groupname != undefined && groupname != _groupname) return;

            consent = CookieConsent.checkConsent(_groupname) || null;

            if(consent == value || value === null) N++;
        });

        return N;
    }

    CookieConsent.refresh = function(defaultConsentDisplayed = false)
    {
        // Check out global consent
        if(this.getNConfirmedConsents() > 1) consent = true;
        else consent = defaultConsentDisplayed;

        // Display new state
        switch(consent) {

            case null: return $(window).trigger("cookie-consent:check");
            case true: return $(window).trigger("cookie-consent:confirm");
            case false: return $(window).trigger("cookie-consent:deny");
        }
    };

    CookieConsent.get = function(key) {
    
        if(key in CookieConsent.settings) 
            return CookieConsent.settings[key];

        return null;
    };

    CookieConsent.set = function(key, value) {
    
        CookieConsent.settings[key] = value;
        return this;
    };

    CookieConsent.add = function(key, value) {
    
        if(! (key in CookieConsent.settings))
            CookieConsent.settings[key] = [];

        if (CookieConsent.settings[key].indexOf(value) === -1)
            CookieConsent.settings[key].push(value);

        return this;
    };

    CookieConsent.remove = function(key, value) {

        if(key in CookieConsent.settings) {

            CookieConsent.settings[key] = CookieConsent.settings[key].filter(function(setting, index, arr){ 
                return value != setting;
            });

            return CookieConsent.settings[key];
        }

        return null;
    };

    CookieConsent.configure = function (options) {

        var key, value;
        for (key in options) {
            value = options[key];
            if (value !== undefined && options.hasOwnProperty(key)) Settings[key] = value;
        }

        if (debug) console.log("CookieConsent configuration: ", Settings);

        return this;
    }

    CookieConsent.onLoad = function (el = window)
    {
        CookieConsent.reset(el);

        return this;
    }

    CookieConsent.change = function(consent, groupname = undefined)
    {
        this.addGroup(groupname);

        consent = Boolean(consent)
        this.get("groupnames").forEach(function (_groupname) {

            if (Array.isArray(groupname) && !_groupname in grouname) return;
            if(!Array.isArray(groupname) && groupname != _groupname & groupname !== undefined) return;

            console.log(_groupname, groupname);
            localStorage.setItem("cookie-consent/" + _groupname, consent);
            if(consent == false) CookieConsent.deleteCookies(_groupname);
        });

        this.refresh();
    }

    CookieConsent.getCookie = function(groupname, name)
    {
        var dc = document.cookie;
        var prefix = groupname+":"+name + "=";

        var begin = dc.indexOf("; " + prefix);
        if (begin == -1) {

            begin = dc.indexOf(prefix);
            if (begin != 0) return null;

        } else {

            begin += 2;
            var end = document.cookie.indexOf(";", begin);
            if (end == -1) end = dc.length;
        }

        return decodeURI(dc.substring(begin + prefix.length, end));
    } 


    CookieConsent.onConfirm = function(onConfirm) 
    {
        $(window).on("cookie-consent:confirm", onConfirm);
        return this;
    }

    CookieConsent.onDeny = function(onDeny) 
    {
        $(window).on("cookie-consent:deny", onDeny);
        return this;
    }

    CookieConsent.onCheck = function(onCheck) 
    {
        $(window).on("cookie-consent:check", onCheck);
        return this;
    }

    CookieConsent.addGroup  = function(groupname) 
    {
        if(groupname === undefined)
            return this;
        if(groupname in Settings.groups)
            return this;

        Settings.groups[groupname] = null;
        return this;
    }

    CookieConsent.getConsents  = function() {

        var consents = [];
        
        for (var i = 0; i < localStorage.length; i++) {

            if (localStorage.key(i).indexOf('cookie-consent/') >= 0)
                consents.push(localStorage.key(i));
        }

        return consents;
    }

    CookieConsent.checkConsent = function(groupname) { return JSON.parse(localStorage.getItem("cookie-consent/" + groupname) || null); }

    CookieConsent.setCookie = function(groupname, name, value, expires, reloadIfNotSet = false, path = "/")
    {
        var reload = false;
        if (!(expires instanceof Date)) {

            switch(typeof expires) {

                case "string":
                    expires = new Date(expires);
                    break;

                default:
                    date = new Date();
                    date.setTime(date.getTime() + Number(expires) * 1000);
                    expires = date;
            }
        }

        if(this.checkConsent(groupname) === false) 
            return;

        // Already came here..
        var cookie = this.getCookie(groupname, name);
        if (cookie == null) reload = reloadIfNotSet;

        if(typeof value == "object")
            value = JSON.stringify(value);

        try {
            
            document.cookie = groupname + ":" + name + "=" + value +
                ";path=" + path +
                ";expires = " + expires.toGMTString() + "; SameSite=Strict; secure";
        
        } catch (e) { 

            try { 

                document.cookie = groupname + ":" + name + "=" + value +
                    ";path=" + path +
                    ";expires = " + expires.toGMTString() + "; SameSite=Strict;";

            } catch (e) {

                console.error(e);
                reload = false; 
            }
        }

        if(reload) location.reload();
    }

    CookieConsent.deleteCookies = function(groupname = "", path = "/") {

        var cookieList = document.cookie.split(";");

        for(var i = 0; i < cookieList.length; i++) {

            var cookie = cookieList[i].trim();
            var cookieName = cookie.split("=")[0];

            // If the prefix of the cookie's name matches the one specified, remove it
            if(cookieName.indexOf(groupname ? groupname+":" : "") === 0)
                document.cookie = cookieName + "=null;expires=Thu, 01 Jan 1970 00:00:00 GMT; path="+path;
        }
    }

    $(window).on("load", () => CookieConsent.onLoad());
    return CookieConsent;
});
