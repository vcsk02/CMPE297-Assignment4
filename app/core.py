"""One task, four generation contracts. Replay is deterministic; live is opt-in."""
import html
import json
import os

TOPICS = ('a2ui', 'agui', 'mcp-apps', 'json-render', 'openui', 'harness')
MODES = ('static', 'declarative', 'open-ended', 'mixed')
CATALOG = {
    'Stack': {'direction': 'column | row'},
    'Text': {'text': 'string'},
    'Metric': {'label': 'string', 'value': 'string'},
    'Button': {'label': 'string', 'action': 'acknowledge'},
    'GeneratedView': {'html': 'string (sandboxed HTML)'},
}


def validate(spec):
    """Validate graph, props, bounds, and actions before any renderer sees it."""
    elements = spec.get('elements', {})
    if not isinstance(elements, dict) or not 1 <= len(elements) <= 50:
        raise ValueError('Expected 1..50 elements')
    if spec.get('root') not in elements:
        raise ValueError('Missing root')
    visiting, visited = set(), set()

    def visit(key, depth=0):
        if depth > 15 or key in visiting or key not in elements:
            raise ValueError('Cycle, missing child, or excessive depth')
        if key in visited:
            return
        visiting.add(key)
        el = elements[key]
        kind, props = el.get('type'), el.get('props', {})
        if kind not in CATALOG or not isinstance(props, dict):
            raise ValueError('Unknown component')
        if set(props) != set(CATALOG[kind]):
            raise ValueError('Unexpected or missing props')
        if any(not isinstance(v, str) or len(v) > 20000 for v in props.values()):
            raise ValueError('Props must be bounded strings')
        if kind == 'Stack' and props['direction'] not in ('column', 'row'):
            raise ValueError('Invalid direction')
        if kind == 'Button' and props['action'] != 'acknowledge':
            raise ValueError('Action not allowed')
        children = el.get('children', [])
        if not isinstance(children, list) or any(not isinstance(c, str) for c in children):
            raise ValueError('Invalid children')
        if children and kind != 'Stack':
            raise ValueError('Only Stack accepts children')
        for child in children:
            visit(child, depth + 1)
        visiting.remove(key)
        visited.add(key)

    visit(spec['root'])
    if visited != set(elements):
        raise ValueError('Unreachable elements')
    return spec


def replay(prompt, mode):
    """An explicit scripted agent, not an LLM. Prompt keywords change layout."""
    detailed = 'detail' in prompt.lower()
    compact = 'compact' in prompt.lower()
    nodes = {}

    def add(key, kind, props, children=None):
        nodes[key] = {'type': kind, 'props': props, 'children': children or []}
        return key

    # Static contract: the application owns this exact layout and all slots.
    children = [add('title', 'Text', {'text': 'Emergency resource dashboard'}),
                add('units', 'Metric', {'label': 'Available response units', 'value': '12'}),
                add('eta', 'Metric', {'label': 'Median arrival', 'value': '8 min'})]
    if mode != 'static':
        if compact:
            children.remove('eta')
            del nodes['eta']
        if detailed:
            children.append(add('detail', 'Text', {'text': 'North: 5 units · South: 7 units · data is synthetic.'}))
    action = add('ack', 'Button', {'label': 'Acknowledge plan', 'action': 'acknowledge'})
    children.append(action)
    if mode in ('open-ended', 'mixed'):
        artifact = ('<!doctype html><html><head></head><body><style>'
                    'body{font:18px system-ui;background:#eafbf6;color:#123b32;padding:24px}'
                    '.route{display:flex;gap:20px;align-items:center}.unit{border:2px solid #147d64;'
                    'border-radius:50%;padding:20px}button{padding:12px;background:#147d64;color:white;border:0}'
                    '</style><h2>Custom deployment map</h2><p>' + html.escape(prompt[:160]) +
                    '</p><div class="route"><div class="unit">North · 5</div><b>→</b>'
                    '<div class="unit">Incident</div><b>←</b><div class="unit">South · 7</div></div>'
                    '<p>Synthetic scenario. Generated markup is isolated from host tools.</p></body></html>')
        generated = add('artifact', 'GeneratedView', {'html': artifact})
        if mode == 'open-ended':
            nodes = {generated: nodes[generated]}
            children = [generated]
        else:
            children.insert(-1, generated)
    add('root', 'Stack', {'direction': 'row' if compact and mode != 'static' else 'column'}, children)
    return validate({'root': 'root', 'elements': nodes})


def generate(prompt, mode):
    if mode not in MODES:
        raise ValueError('Unknown mode')
    provider = os.getenv('UI_PROVIDER', 'replay')
    if provider == 'replay':
        return replay(prompt, mode), 'deterministic replay (no model call)'
    if provider != 'openai':
        raise ValueError('Unknown UI_PROVIDER')
    from openai import OpenAI
    template = replay(prompt, mode)
    rules = f'Catalog: {json.dumps(CATALOG)}. Example schema: {json.dumps(template)}. '
    rules += ('Preserve exact element ids, types, children; change only text and metric values.' if mode == 'static' else
              'Use GeneratedView only in open-ended/mixed. In open-ended use only Stack and GeneratedView. In mixed include GeneratedView and catalog components.')
    response = OpenAI().chat.completions.create(
        model=os.environ['OPENAI_MODEL'], response_format={'type': 'json_object'},
        messages=[{'role': 'system', 'content': 'Return one valid UI spec JSON object. ' + rules},
                  {'role': 'user', 'content': prompt}], max_completion_tokens=3000)
    spec = validate(json.loads(response.choices[0].message.content))
    signature = lambda graph: {k: (v['type'], v.get('children', [])) for k, v in graph['elements'].items()}
    if mode == 'static' and signature(spec) != signature(template):
        raise ValueError('Static layout changed')
    kinds = {v['type'] for v in spec['elements'].values()}
    if mode == 'declarative' and 'GeneratedView' in kinds:
        raise ValueError('Declarative mode forbids generated HTML')
    if mode == 'open-ended' and (not kinds <= {'Stack', 'GeneratedView'} or 'GeneratedView' not in kinds):
        raise ValueError('Open-ended mode requires generated HTML')
    if mode == 'mixed' and ('GeneratedView' not in kinds or not kinds - {'Stack', 'GeneratedView'}):
        raise ValueError('Mixed mode requires both kinds')
    return spec, f'live model: {response.model}'


def action(name):
    if name != 'acknowledge':
        raise ValueError('Action not allowed')
    return {'accepted': True, 'message': 'Plan acknowledged in this demo session.'}
