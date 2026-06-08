// 大纲助手 — 全貌地图 v4（分幕结构）

(function() {
    'use strict';

    // ==================== 颜色 ====================
    var THREAD_STYLES = {
        main:      { color: '#FFB74D', bg: '#FFF8E1', border: '#FFE0B2', icon: '🔥' },
        romance:   { color: '#F06292', bg: '#FCE4EC', border: '#F8BBD0', icon: '💕' },
        career:    { color: '#4FC3F7', bg: '#E1F5FE', border: '#B3E5FC', icon: '💼' },
        mystery:   { color: '#AB47BC', bg: '#F3E5F5', border: '#CE93D8', icon: '🔍' },
        friendship:{ color: '#66BB6A', bg: '#E8F5E9', border: '#A5D6A7', icon: '🤝' },
        character: { color: '#FF8A65', bg: '#FBE9E7', border: '#FFAB91', icon: '👤' },
        setting:   { color: '#78909C', bg: '#ECEFF1', border: '#B0BEC5', icon: '🌍' },
        subplot:   { color: '#9CCC65', bg: '#F1F8E9', border: '#C5E1A5', icon: '📎' },
        conflict:  { color: '#EF5350', bg: '#FFEBEE', border: '#EF9A9A', icon: '⚡' },
    };

    var PHASE_COLORS = [
        { color: '#FFB74D', bg: '#FFF8E1', icon: '一' },
        { color: '#F06292', bg: '#FCE4EC', icon: '二' },
        { color: '#4FC3F7', bg: '#E1F5FE', icon: '三' },
        { color: '#AB47BC', bg: '#F3E5F5', icon: '四' },
        { color: '#66BB6A', bg: '#E8F5E9', icon: '五' },
    ];

    function getStyle(type) {
        return THREAD_STYLES[type] || THREAD_STYLES.main;
    }

    function esc(t) {
        var d = document.createElement('div');
        d.textContent = t || '';
        return d.innerHTML;
    }

    // ==================== 渲染 ====================
    function renderDashboard(container) {
        var data = getMapData();
        if (!data) { renderEmpty(container); return; }

        var title = data.title || '故事大纲';
        var tagline = data.tagline || '';
        var phases = data.phases || [];
        var threads = data.threads || [];
        var events = data.events || [];
        var contradictions = data.contradictions || [];
        var missing = data.missing || [];

        if (events.length === 0 && threads.length === 0) {
            renderEmpty(container);
            return;
        }

        var html = '<div class="dashboard">';

        // ---- 顶部：标题概要 ----
        html += '<div class="dash-header">';
        html += '<h2 class="dash-title">' + esc(title) + '</h2>';
        if (tagline) {
            html += '<p class="dash-tagline">' + esc(tagline) + '</p>';
        }
        html += '<div class="dash-stats">';
        html += '<span class="stat">' + threads.length + ' 条故事线</span>';
        html += '<span class="stat-dot">·</span>';
        html += '<span class="stat">' + (phases.length || 1) + ' 幕</span>';
        html += '<span class="stat-dot">·</span>';
        html += '<span class="stat">' + events.length + ' 个关键事件</span>';
        if (contradictions.length > 0) {
            html += '<span class="stat-dot">·</span>';
            html += '<span class="stat" style="color:#FFB74D">' + contradictions.length + ' 个矛盾点</span>';
        }
        if (missing.length > 0) {
            html += '<span class="stat-dot">·</span>';
            html += '<span class="stat" style="color:#AB47BC">' + missing.length + ' 个缺失项</span>';
        }
        html += '</div>';
        html += '</div>';

        // ---- 主体：左侧边栏 + 右侧时间线 ----
        html += '<div class="dash-body">';

        // 左侧边栏
        html += '<div class="dash-sidebar">';

        // 故事线
        if (threads.length > 0) {
            html += '<div class="dash-section">';
            html += '<h3 class="dash-section-title">故事线</h3>';
            threads.forEach(function(t) {
                var style = getStyle(t.type);
                html += '<div class="thread-row">';
                html += '<span class="thread-icon">' + style.icon + '</span>';
                html += '<span class="thread-label">' + esc(t.label) + '</span>';
                html += '</div>';
            });
            html += '</div>';
        }

        // 分幕概览
        if (phases.length > 0) {
            html += '<div class="dash-section">';
            html += '<h3 class="dash-section-title">分幕结构</h3>';
            phases.forEach(function(p, i) {
                var pc = PHASE_COLORS[i % PHASE_COLORS.length];
                var phaseEvents = events.filter(function(e) { return e.phase === p.id; });
                html += '<div class="phase-row" data-phase="' + p.id + '">';
                html += '<span class="phase-icon" style="background:' + pc.color + '">' + pc.icon + '</span>';
                html += '<span class="phase-label">' + esc(p.label) + '</span>';
                html += '<span class="phase-count">' + phaseEvents.length + '个事件</span>';
                html += '</div>';
            });
            html += '</div>';
        }

        // 矛盾点
        if (contradictions.length > 0) {
            html += '<div class="dash-section">';
            html += '<h3 class="dash-section-title">⚡ 矛盾点</h3>';
            contradictions.forEach(function(c) {
                html += '<div class="issue-card warn">' + esc(c.text) + '</div>';
            });
            html += '</div>';
        }

        // 缺失项
        if (missing.length > 0) {
            html += '<div class="dash-section">';
            html += '<h3 class="dash-section-title">❓ 缺失项</h3>';
            missing.forEach(function(m) {
                html += '<div class="issue-card missing">' + esc(m.text) + '</div>';
            });
            html += '</div>';
        }

        html += '</div>'; // end sidebar

        // 右侧：按幕分组的事件时间线
        html += '<div class="dash-timeline">';

        if (phases.length > 0) {
            // 按幕分组展示
            phases.forEach(function(phase, pi) {
                var pc = PHASE_COLORS[pi % PHASE_COLORS.length];
                var phaseEvents = events.filter(function(e) { return e.phase === phase.id; });

                html += '<div class="phase-group" id="phase-group-' + phase.id + '">';
                html += '<div class="phase-header">';
                html += '<span class="phase-badge" style="background:' + pc.color + '">' + pc.icon + '</span>';
                html += '<span class="phase-title">' + esc(phase.label) + '</span>';
                html += '<span class="phase-event-count">' + phaseEvents.length + ' 个关键事件</span>';
                html += '</div>';

                if (phaseEvents.length > 0) {
                    phaseEvents.forEach(function(evt, ei) {
                        var thread = threads.find(function(t) { return t.id === evt.thread; }) || { type: 'main', label: '主线' };
                        var style = getStyle(thread.type);
                        html += '<div class="event-row">';
                        html += '<div class="event-num" style="background:' + style.color + '">' + (ei + 1) + '</div>';
                        html += '<div class="event-body">';
                        html += '<div class="event-top">';
                        html += '<span class="event-name">' + esc(evt.label) + '</span>';
                        html += '<span class="event-tag" style="color:' + style.color + ';background:' + style.bg + '">' + style.icon + ' ' + esc(thread.label || evt.thread) + '</span>';
                        html += '</div>';
                        if (evt.desc) {
                            html += '<div class="event-desc">' + esc(evt.desc) + '</div>';
                        }
                        html += '</div>';
                        html += '</div>';
                    });
                } else {
                    html += '<div class="event-row" style="opacity:0.5"><div class="event-body"><div class="event-desc">暂无关键事件，继续在想法梳理中完善</div></div></div>';
                }

                html += '</div>'; // end phase-group
            });
        } else {
            // 没有分幕信息，平铺展示
            html += '<h3 class="dash-section-title" style="margin-bottom:16px">事件时间线</h3>';
            events.forEach(function(evt, i) {
                var thread = threads.find(function(t) { return t.id === evt.thread; }) || { type: 'main', label: '主线' };
                var style = getStyle(thread.type);
                html += '<div class="event-row">';
                html += '<div class="event-num" style="background:' + style.color + '">' + (i + 1) + '</div>';
                html += '<div class="event-body">';
                html += '<div class="event-top">';
                html += '<span class="event-name">' + esc(evt.label) + '</span>';
                html += '<span class="event-tag" style="color:' + style.color + ';background:' + style.bg + '">' + style.icon + ' ' + esc(thread.label || evt.thread) + '</span>';
                html += '</div>';
                if (evt.desc) {
                    html += '<div class="event-desc">' + esc(evt.desc) + '</div>';
                }
                html += '</div>';
                html += '</div>';
            });
        }

        html += '</div>'; // end timeline
        html += '</div>'; // end body

        // 操作按钮
        html += '<div class="dash-actions">';
        html += '<button class="dash-btn" id="map-extract-btn">✦ 从对话重新提取</button>';
        html += '<button class="dash-btn" id="map-export-btn">📄 导出大纲</button>';
        html += '<button class="dash-btn secondary" id="map-clear-btn">清空地图</button>';
        html += '</div>';

        html += '</div>'; // end dashboard

        container.innerHTML = html;

        // 绑定事件
        var extractBtn = document.getElementById('map-extract-btn');
        if (extractBtn) extractBtn.addEventListener('click', extractFromConversation);
        var exportBtn = document.getElementById('map-export-btn');
        if (exportBtn) exportBtn.addEventListener('click', exportOutline);
        var clearBtn = document.getElementById('map-clear-btn');
        if (clearBtn) clearBtn.addEventListener('click', function() {
            localStorage.removeItem('oa_map_data');
            renderEmpty(container);
        });

        // 侧边栏分幕点击 → 滚动到对应分组
        document.querySelectorAll('.phase-row[data-phase]').forEach(function(row) {
            row.style.cursor = 'pointer';
            row.addEventListener('click', function() {
                var phaseId = row.getAttribute('data-phase');
                var target = document.getElementById('phase-group-' + phaseId);
                if (target) {
                    var timeline = container.querySelector('.dash-timeline');
                    if (timeline) {
                        var offset = target.offsetTop - timeline.offsetTop;
                        timeline.scrollTo({ top: offset - 12, behavior: 'smooth' });
                    }
                    // 高亮闪烁
                    target.classList.add('phase-flash');
                    setTimeout(function() { target.classList.remove('phase-flash'); }, 800);
                }
            });
        });
    }

    // ==================== 空状态 ====================
    function renderEmpty(container) {
        var oa = window._oa;
        var hasConv = oa && oa.getConversation && oa.getConversation().length > 0;
        container.innerHTML =
            '<div class="map-empty">' +
                '<div class="map-empty-icon">✦</div>' +
                '<h2>还没有故事结构</h2>' +
                '<p>去「想法梳理」跟AI聊聊你的故事想法，<br>分析结果会自动出现在这里</p>' +
                (hasConv ? '<button class="map-extract-btn" id="map-extract-btn">✦ 从对话中提取故事结构</button>' : '') +
            '</div>';
        if (hasConv) {
            document.getElementById('map-extract-btn').addEventListener('click', extractFromConversation);
        }
    }

    // ==================== 数据获取 ====================
    function getMapData() {
        var saved = localStorage.getItem('oa_map_data');
        if (saved) {
            try {
                var data = JSON.parse(saved);
                // 兼容旧的 nodes 格式
                if (data.nodes && !data.phases) {
                    console.log('[地图] 检测到旧格式数据，需要重新提取');
                    return null;
                }
                return data;
            } catch(e) {}
        }
        return null;
    }

    // ==================== 从对话提取 ====================
    function extractFromConversation() {
        var oa = window._oa;
        if (!oa) return;
        var conv = oa.getConversation();
        var allText = '';
        conv.forEach(function(msg) {
            if (msg.role === 'assistant') allText += msg.content + '\n\n';
        });
        if (!allText) { oa.showToast('还没有AI对话内容', 'error'); return; }

        var mapData = oa.extractMapData(allText);
        if (mapData) {
            oa.mergeMapData(mapData);
            oa.showToast('已提取到全貌地图 ✦', 'success');
            refresh();
        } else {
            oa.showToast('对话中没有找到可提取的故事结构', 'error');
        }
    }

    // ==================== 导出大纲 ====================
    function exportOutline() {
        var data = getMapData();
        if (!data || (data.events.length === 0 && data.threads.length === 0)) {
            window._oa && window._oa.showToast('没有可导出的大纲数据', 'error');
            return;
        }

        var phases = data.phases || [];
        var threads = data.threads || [];
        var events = data.events || [];
        var contradictions = data.contradictions || [];
        var missing = data.missing || [];

        var lines = [];
        lines.push('# ' + (data.title || '故事大纲'));
        if (data.tagline) lines.push('> ' + data.tagline);
        lines.push('');

        // 概览
        lines.push('**' + threads.length + ' 条故事线 · ' + (phases.length || 1) + ' 幕 · ' + events.length + ' 个关键事件**');
        lines.push('');

        // 故事线
        if (threads.length > 0) {
            lines.push('## 故事线');
            lines.push('');
            threads.forEach(function(t) {
                lines.push('- ' + t.label);
            });
            lines.push('');
        }

        // 按幕输出事件
        if (phases.length > 0) {
            phases.forEach(function(phase, pi) {
                var phaseEvents = events.filter(function(e) { return e.phase === phase.id; });
                lines.push('## ' + phase.label);
                lines.push('');
                if (phaseEvents.length > 0) {
                    phaseEvents.forEach(function(evt, ei) {
                        var thread = threads.find(function(t) { return t.id === evt.thread; });
                        var tag = thread ? '（' + thread.label + '）' : '';
                        var num = (pi + 1) + '.' + (ei + 1);
                        lines.push(num + '. **' + evt.label + '**' + tag);
                        if (evt.desc) lines.push('   ' + evt.desc);
                    });
                } else {
                    lines.push('（暂无关键事件）');
                }
                lines.push('');
            });
        } else if (events.length > 0) {
            lines.push('## 关键事件');
            lines.push('');
            events.forEach(function(evt, i) {
                var thread = threads.find(function(t) { return t.id === evt.thread; });
                var tag = thread ? '（' + thread.label + '）' : '';
                lines.push((i + 1) + '. **' + evt.label + '**' + tag);
                if (evt.desc) lines.push('   ' + evt.desc);
            });
            lines.push('');
        }

        // 矛盾点
        if (contradictions.length > 0) {
            lines.push('## ⚡ 矛盾点');
            lines.push('');
            contradictions.forEach(function(c) {
                lines.push('- ⚠️ ' + c.text);
            });
            lines.push('');
        }

        // 缺失项
        if (missing.length > 0) {
            lines.push('## ❓ 缺失项');
            lines.push('');
            missing.forEach(function(m) {
                lines.push('- ❓ ' + m.text);
            });
            lines.push('');
        }

        // 生成文件下载
        var md = lines.join('\n');
        var filename = (data.title || '故事大纲').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '_') + '_大纲.md';
        var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        window._oa && window._oa.showToast('大纲已导出 ✦', 'success');
    }

    // ==================== 刷新 ====================
    function refresh() {
        var container = document.getElementById('map-canvas');
        if (container) {
            container.innerHTML = '';
            renderDashboard(container);
        }
    }

    // ==================== 初始化 ====================
    function initMap() {
        var container = document.getElementById('map-canvas');
        if (!container) return;
        container.innerHTML = '';
        renderDashboard(container);
    }

    // ==================== 公开接口 ====================
    window.MapViz = {
        init: initMap,
        refresh: refresh,
        updateData: function(data) {
            localStorage.setItem('oa_map_data', JSON.stringify(data));
            refresh();
        },
        clearData: function() {
            localStorage.removeItem('oa_map_data');
            refresh();
        },
    };
})();
