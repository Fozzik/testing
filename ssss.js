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
            '.pornhub-list__content{flex:1;overflow:auto;padding:10px 16px;}' +
            '.pornhub-list__items{display:flex;flex-direction:column;gap:8px;}' +
            '.pornhub-list__item{padding:12px 14px;border:1px solid #292929;border-radius:8px;background:#111;color:#fff;cursor:pointer;}' +
            '.pornhub-list__item:hover, .pornhub-list__item.active{background:#222;}' +
            '.pornhub-list__item-title{font-size:15px;font-weight:600;margin-bottom:6px;line-height:1.25;}' +
            '.pornhub-list__item-subtitle, .pornhub-list__item-desc{font-size:12px;color:#a8a8a8;line-height:1.4;}' +
            '</style>');
        $('body').append(Lampa.Template.get(PLUGIN_NAME + '_css', {}, true));
    }

    function ensureUrl(url, useProxy) {
        var proxy = Lampa.Storage.get('adultjs_proxy', '').trim();

        if (!proxy || useProxy === false) {
            return url;
        }

        if (proxy.includes('{url}')) {
            return proxy.replace('{url}', encodeURIComponent(url));
        }

        return proxy.replace(/\/+$/g, '') + encodeURIComponent(url);
    }

    function ensureHeaders(headers) {
        var result = headers ? Object.assign({}, headers) : {};

        if (!result['User-Agent'] && !result['user-agent']) {
            result['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
        }

        if (!result['Accept-Language']) {
            result['Accept-Language'] = 'en-US,en;q=0.9';
        }

        return result;
    }

    function isBlockedResponse(text) {
        if (!text || text.length < 200) {
            return true;
        }

        var lower = text.toLowerCase();

        return lower.indexOf('accès à notre site suspendu') !== -1 ||
            lower.indexOf('access suspended') !== -1 ||
            lower.indexOf('limited-functionality') !== -1 ||
            lower.indexOf('cookiebanner') !== -1 ||
            lower.indexOf('pornhub is rated') !== -1 ||
            lower.indexOf('verify your age') !== -1 ||
            (lower.indexOf('france') !== -1 && lower.indexOf('suspendu') !== -1);
    }

    function buildPageUrl(route, page) {
        return SITE_HOST + route.replace('{page}', page);
    }

    function parseVideoList(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var nodes = doc.querySelectorAll('li.videoblock');
        var results = [];

        if (!nodes.length) {
            nodes = doc.querySelectorAll('li.videoblock, div.videoBox, div.pcVideoListItem, div.videoPreview, div.videoBlock, div.video-card, article.videoBox, a[href*="/view_video.php?viewkey="], a[href*="/video?viewkey="], a[href*="/view_video.php?v="]');
        }

        nodes.forEach(function(node) {
            var link = node.tagName.toLowerCase() === 'a' ? node : node.querySelector('a.linkVideoThumb, span.title a, a[href*="/view_video.php?viewkey="], a[href*="/video?viewkey="], a[href*="/view_video.php?v="]');
            var href = link ? link.getAttribute('href') : null;
            if (!href) return;

            if (href.indexOf('http') !== 0) {
                href = SITE_HOST + href;
            }

            var titleNode = node.querySelector('span.title a, .title a, a.title, .videoTitle, .video-title');
            var title = (titleNode ? titleNode.textContent.trim() : '') || (link ? link.getAttribute('title') : '') || (link ? link.textContent.trim() : '');
            var imgNode = node.querySelector('img') || (link && link.querySelector('img'));
            var image = imgNode ? (imgNode.getAttribute('data-thumb_url') || imgNode.getAttribute('src') || imgNode.getAttribute('data-src') || '') : '';
            var durationNode = node.querySelector('.duration, .videoDuration, .videoLength, .time, .previewDuration');
            var duration = durationNode ? durationNode.textContent.trim() : '';
            var modelNode = node.querySelector('a[href*="/model/"]');
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

    function requestPage(url, callback, fail, directAttempted) {
        var useProxy = directAttempted !== true;
        var requestUrl = ensureUrl(url, useProxy);

        function handleResponse(text) {
            if (useProxy && isBlockedResponse(text) && !directAttempted) {
                requestPage(url, callback, fail, true);
                return;
            }
            callback(text);
        }

        if (window.Lampa && Lampa.Reguest) {
            var r = new Lampa.Reguest();
            r.native(requestUrl, function(responseText) {
                handleResponse(responseText);
            }, function(error) {
                if (!directAttempted) {
                    requestPage(url, callback, fail, true);
                    return;
                }
                fail('Ошибка запроса');
            }, false, { dataType: 'text', timeout: 10000, headers: ensureHeaders() });
            return;
        }

        fetch(requestUrl, {
            method: 'GET',
            headers: ensureHeaders()
        })
            .then(function(response) {
                if (!response.ok) throw new Error('Статус ' + response.status);
                return response.text();
            })
            .then(handleResponse)
            .catch(function(error) {
                if (!directAttempted) {
                    requestPage(url, callback, fail, true);
                    return;
                }
                fail(error.message || 'Ошибка сети');
            });
    }

    function renderList(items, onSelect) {
        var container = $('<div class="pornhub-list__content"></div>');
        var list = $('<div class="pornhub-list__items"></div>');

        items.forEach(function(item) {
            var itemNode = $('<div class="pornhub-list__item selector">' +
                '<div class="pornhub-list__item-title">' + item.title + '</div>' +
                (item.subtitle ? '<div class="pornhub-list__item-subtitle">' + item.subtitle + '</div>' : '') +
                (item.description ? '<div class="pornhub-list__item-desc">' + item.description + '</div>' : '') +
                '</div>');

            itemNode.on('hover:enter click', function() {
                onSelect(item);
            });

            list.append(itemNode);
        });

        container.append(list);
        return container;
    }

    function showCategoryList(status, container) {
        status.text('Выбери жанр');

        var items = CATEGORIES.map(function(category) {
            return {
                title: category.title,
                subtitle: category.route.replace('{page}', '1'),
                category: category,
                action: 'category'
            };
        });

        container.find('.pornhub-list__content').remove();
        container.append(renderList(items, function(item) {
            showVideoList(item.category, 1, status, container);
        }));
    }

    function showVideoList(category, page, status, container, forceDirect) {
        var proxy = Lampa.Storage.get('adultjs_proxy', '').trim();
        status.text('Загрузка ' + category.title + ', страница ' + page + (forceDirect ? ' напрямую' : (proxy ? ' через прокси' : '')) + '...');
        var url = buildPageUrl(category.route, page);

        requestPage(url, function(text) {
            var items = parseVideoList(text);
            if (!items.length) {
                var actions = [];

                if (proxy) {
                    actions.push({ title: 'Попробовать без прокси', action: 'trydirect', category: category, page: page });
                }

                actions.push({ title: 'Открыть категорию в браузере', url: url, action: 'openlink' });
                actions.push({ title: '← Жанры', action: 'back' });

                container.find('.pornhub-list__content').remove();
                container.append(renderList(actions, function(item) {
                    if (item.action === 'trydirect') {
                        showVideoList(category, page, status, container, true);
                        return;
                    }
                    if (item.action === 'openlink') {
                        status.text('Скопируй ссылку, чтобы открыть страницу: ' + item.url);
                        Lampa.Noty.show(item.url);
                        return;
                    }
                    if (item.action === 'back') {
                        showCategoryList(status, container);
                        return;
                    }
                }));

                status.text('Пустая страница или блокировка. Попробуй другой прокси или открой категорию вручную.');
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
                    url: item.url,
                    action: 'open',
                    category: category,
                    page: page
                });
            });

            list.push({ title: 'Далее →', action: 'next', category: category, page: page });
            list.push({ title: '← Жанры', action: 'back' });

            container.find('.pornhub-list__content').remove();
            container.append(renderList(list, function(item) {
                if (item.action === 'prev') {
                    showVideoList(category, page - 1, status, container);
                    return;
                }
                if (item.action === 'next') {
                    showVideoList(category, page + 1, status, container);
                    return;
                }
                if (item.action === 'back') {
                    showCategoryList(status, container);
                    return;
                }
                if (item.action === 'open') {
                    status.text('Скопируй ссылку, чтобы открыть видео: ' + item.url);
                    Lampa.Noty.show(item.url);
                    return;
                }
            }));

            status.text('Выбрано: ' + category.title + '. На странице ' + page + '.');
        }, function(error) {
            status.text('Ошибка загрузки: ' + error);
        });
    }

    function PornhubList() {
        var html = $('<div class="pornhub-list"></div>');
        var status = createStatus('Загрузка плагина...');
        var content = $('<div class="pornhub-list__content"></div>');
        html.append(status);
        html.append(content);

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
