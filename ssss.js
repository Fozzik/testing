(function() {
    'use strict';

    var PLUGIN_NAME = 'pornhub_site';
    var PLUGIN_COMPONENT = 'pornhub_site';
    var PLUGIN_TITLE = 'PornHub';
    var SITE_URL = 'https://rt.pornhub.com/';

    function addStyles() {
        Lampa.Template.add(PLUGIN_NAME + '_css', '<style>' +
            '.pornhub-site{width:100%;height:100%;display:flex;flex-direction:column;background:#000;}' +
            '.pornhub-site__header{padding:10px 16px;display:flex;justify-content:space-between;align-items:center;background:#111;}' +
            '.pornhub-site__header-left{font-size:18px;font-weight:600;color:#fff;}' +
            '.pornhub-site__header-right{display:flex;gap:8px;}' +
            '.pornhub-site__button{padding:8px 12px;border:none;border-radius:4px;background:#222;color:#fff;font-size:14px;cursor:pointer;}' +
            '.pornhub-site__button:hover{background:#333;}' +
            '.pornhub-site__button.active{background:#f60;color:#000;}' +
            '.pornhub-site__status{padding:8px 16px;font-size:13px;color:#ccc;background:#0d0d0d;}' +
            '.pornhub-site__body{position:relative;flex:1;overflow:hidden;}' +
            '.pornhub-site__iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0;background:#000;}' +
            '</style>');
        $('body').append(Lampa.Template.get(PLUGIN_NAME + '_css', {}, true));
    }

    function ensureUrl(url) {
        var proxy = Lampa.Storage.get('adultjs_proxy', '').trim();

        if (!proxy) {
            return url;
        }

        if (proxy.includes('{url}')) {
            return proxy.replace('{url}', encodeURIComponent(url));
        }

        return proxy.replace(/\/+$|^\s+|\s+$/g, '') + encodeURIComponent(url);
    }

    function PornhubSite() {
        var proxy = Lampa.Storage.get('adultjs_proxy', '').trim();
        var directUrl = SITE_URL;
        var proxyUrl = proxy ? ensureUrl(SITE_URL) : directUrl;
        var html = $(
            '<div class="pornhub-site">' +
            '<div class="pornhub-site__header">' +
            '<div class="pornhub-site__header-left">' + PLUGIN_TITLE + '</div>' +
            '<div class="pornhub-site__header-right">' +
            '<button class="pornhub-site__button" data-mode="direct">Прямо</button>' +
            '<button class="pornhub-site__button" data-mode="proxy">Через прокси</button>' +
            '</div>' +
            '</div>' +
            '<div class="pornhub-site__status"></div>' +
            '<div class="pornhub-site__body">' +
            '<iframe class="pornhub-site__iframe" src="' + proxyUrl + '" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" allowfullscreen></iframe>' +
            '</div>' +
            '</div>'
        );

        var iframe = html.find('.pornhub-site__iframe');
        var status = html.find('.pornhub-site__status');
        var buttons = html.find('.pornhub-site__button');

        function updateStatus(mode) {
            var text = mode === 'proxy'
                ? 'Загружено через прокси'
                : 'Загружено напрямую';
            if (mode === 'proxy' && !proxy) {
                text = 'Прокси не настроен. Установи adultjs_proxy в настройках.';
            }
            status.text(text);
        }

        function setMode(mode) {
            if (mode === 'proxy' && !proxy) {
                updateStatus(mode);
                return;
            }

            buttons.removeClass('active');
            html.find('.pornhub-site__button[data-mode="' + mode + '"]').addClass('active');
            iframe.attr('src', mode === 'proxy' ? proxyUrl : directUrl);
            updateStatus(mode);
        }

        buttons.on('hover:enter click', function() {
            setMode($(this).data('mode'));
        });

        this.create = function() {
            this.activity.loader(false);
            this.activity.toggle();
            setMode(proxy ? 'proxy' : 'direct');
            return html;
        };

        this.start = function() {
            Lampa.Controller.add('content', {
                toggle: function() {},
                back: this.back.bind(this)
            });
            Lampa.Controller.toggle('content');
        };

        this.back = function() {
            Lampa.Activity.backward();
        };

        this.pause = function() {};
        this.stop = function() {};

        this.render = function() {
            return html;
        };

        this.destroy = function() {
            buttons.off('hover:enter click');
            html.remove();
        };
    }

    function addMenuButton() {
        var button = $('<li class="menu__item selector">' +
            '<div class="menu__ico">' +
            '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 4h12v2H6V4zm0 4h12v2H6V8zm0 4h12v2H6v-2zm0 4h12v2H6v-2z"></path></svg>' +
            '</div>' +
            '<div class="menu__text">' + PLUGIN_TITLE + '</div>' +
            '</li>');

        button.on('hover:enter', function() {
            Lampa.Activity.push({
                url: '',
                title: PLUGIN_TITLE,
                component: PLUGIN_COMPONENT,
                page: 1
            });
        });

        $('.menu .menu__list').eq(0).append(button);
    }

    function startPlugin() {
        if (window[PLUGIN_NAME + '_ready']) return;
        window[PLUGIN_NAME + '_ready'] = true;

        addStyles();
        Lampa.Component.add(PLUGIN_COMPONENT, PornhubSite);

        if (window.appready) {
            addMenuButton();
        } else {
            Lampa.Listener.follow('app', function(event) {
                if (event.type === 'ready') addMenuButton();
            });
        }
    }

    function ensureReady(callback) {
        if (window.Lampa && window.Lampa.Component && window.Lampa.Listener) {
            callback();
        } else {
            window.addEventListener('load', callback);
        }
    }

    ensureReady(startPlugin);
})();
