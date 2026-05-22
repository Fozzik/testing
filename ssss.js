(function() {
    'use strict';

    var PLUGIN_NAME = 'pornhub_list';
    var PLUGIN_COMPONENT = 'pornhub_list';
    var PLUGIN_TITLE = 'PornHub';
    var SITE_HOST = 'https://rt.pornhub.com';

    var CATEGORIES = [
        { title: 'Все', route: '/video?page={page}' },
        { title: 'Русское', route: '/language/russian?page={page}' },
        { title: 'Анальный секс', route: '/video?c=35&page={page}' },
        { title: 'Мамочки', route: '/video?c=29&page={page}' },
        { title: 'Мулаты', route: '/video?c=17&page={page}' },
        { title: 'Лесбиянки', route: '/video?c=27&page={page}' },
        { title: 'Секс втроем', route: '/video?c=65&page={page}' },
        { title: 'Большая грудь', route: '/video?c=8&page={page}' },
        { title: 'На публике', route: '/video?c=24&page={page}' },
        { title: 'БДСМ', route: '/video?c=10&page={page}' },
        { title: 'Хентай', route: '/categories/hentai?page={page}' },
        { title: 'Юные', route: '/categories/teen?page={page}' },
        { title: 'Трансгендер', route: '/transgender?page={page}' },
        { title: 'Гей', route: '/gayporn?page={page}' }
    ];

    function addStyles() {
        Lampa.Template.add(PLUGIN_NAME + '_css', '<style>' +
            '.pornhub-list{width:100%;height:100%;display:flex;flex-direction:column;background:#050505;color:#fff;}' +
            '.pornhub-list__status{padding:12px 16px;font-size:14px;color:#ddd;background:#0f0f0f;border-bottom:1px solid #222;}' +
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

        return proxy.replace(/\/+$/g, '') + encodeURIComponent(url);
    }

    function buildPageUrl(route, page) {
        return SITE_HOST + route.replace('{page}', page);
    }

    function parseVideoList(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var nodes = doc.querySelectorAll('li.videoblock');
        var results = [];

        nodes.forEach(function(node) {
            var link = node.querySelector('a.linkVideoThumb, span.title a');
            var href = link ? link.getAttribute('href') : null;
            if (!href) return;

            if (href.indexOf('http') !== 0) {
                href = SITE_HOST + href;
            }

            var titleNode = node.querySelector('span.title a');
            var title = titleNode ? titleNode.textContent.trim() : (link.textContent || '').trim();
            var imgNode = node.querySelector('img');
            var image = imgNode ? (imgNode.getAttribute('data-thumb_url') || imgNode.getAttribute('src') || '') : '';
            var durationNode = node.querySelector('.duration');
            var duration = durationNode ? durationNode.textContent.trim() : '';
            var modelNode = node.querySelector('a[href*=\"/model/\"]');
            var model = modelNode ? modelNode.textContent.trim() : '';

            results.push({
                title: title || 'Без названия',
                url: href,
                icon: image,
                subtitle: duration || '',
                description: model ? 'Модель: ' + model : ''
            });
        });

        return results;
    }

    function createStatus(text) {
        return $('<div class="pornhub-list__status">' + text + '</div>');
    }

    function requestPage(url, callback, fail) {
        var requestUrl = ensureUrl(url);

        if (window.Lampa && Lampa.Reguest) {
            var r = new Lampa.Reguest();
            r.native(requestUrl, function(responseText) {
                callback(responseText);
            }, function() {
                fail('Ошибка запроса');
            }, false, { dataType: 'text' });
            return;
        }

        fetch(requestUrl, { method: 'GET' })
            .then(function(response) {
                if (!response.ok) throw new Error('Статус ' + response.status);
                return response.text();
            })
            .then(callback)
            .catch(function(error) {
                fail(error.message || 'Ошибка сети');
            });
    }

    function showVideoList(category, page, status, container) {
        status.text('Загрузка ' + category.title + ', страница ' + page + '...');
        var url = buildPageUrl(category.route, page);

        requestPage(url, function(text) {
            var items = parseVideoList(text);
            if (!items.length) {
                status.text('Пустая страница или изменённый сайт. Попробуй другой жанр.');
                return;
            }

            var list = [];
            if (page > 1) {
                list.push({ title: '← Назад', action: 'prev' });
            }

            items.forEach(function(item) {
                list.push({
                    title: item.title,
                    subtitle: item.subtitle,
                    description: item.description,
                    icon: item.icon,
                    url: item.url,
                    action: 'open'
                });
            });

            list.push({ title: 'Далее →', action: 'next' });

            Lampa.Select.show({
                title: category.title + ' — страница ' + page,
                items: list,
                onBack: function() {
                    showCategoryList(status, container);
                },
                onSelect: function(item) {
                    if (item.action === 'prev') {
                        showVideoList(category, page - 1, status, container);
                        return;
                    }
                    if (item.action === 'next') {
                        showVideoList(category, page + 1, status, container);
                        return;
                    }
                    if (item.url) {
                        status.text('Скопируй ссылку, чтобы открыть видео: ' + item.url);
                        Lampa.Noty.show(item.url);
                    }
                }
            });

            status.text('Выбрано: ' + category.title + '. На странице ' + page + '.');
        }, function(error) {
            status.text('Ошибка загрузки: ' + error);
        });
    }

    function showCategoryList(status, container) {
        status.text('Выбери жанр');
        var items = CATEGORIES.map(function(category) {
            return {
                title: category.title,
                subtitle: category.route.replace('{page}', '1'),
                action: 'category',
                category: category
            };
        });

        Lampa.Select.show({
            title: PLUGIN_TITLE + ' — Жанры',
            items: items,
            onBack: function() {
                Lampa.Activity.backward();
            },
            onSelect: function(item) {
                showVideoList(item.category, 1, status, container);
            }
        });
    }

    function PornhubList() {
        var html = $('<div class="pornhub-list"></div>');
        var status = createStatus('Загрузка плагина...');
        html.append(status);

        this.create = function() {
            this.activity.loader(false);
            this.activity.toggle();
            return html;
        };

        this.start = function() {
            showCategoryList(status, html);
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
            html.remove();
        };
    }

    function addMenuButton() {
        var button = $('<li class="menu__item selector">' +
            '<div class="menu__ico"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 4h12v2H6V4zm0 4h12v2H6V8zm0 4h12v2H6v-2zm0 4h12v2H6v-2z"></path></svg></div>' +
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
        Lampa.Component.add(PLUGIN_COMPONENT, PornhubList);

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
