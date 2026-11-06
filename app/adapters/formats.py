"""Translate the shared teaching graph into real library input formats."""
import json

A2UI_CATALOG = 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json'


def a2ui(spec):
    """Basic A2UI has no arbitrary HTML: artifacts remain a host-side region."""
    components, artifacts = [], []
    def convert(key):
        node = spec['elements'][key]
        kind, p = node['type'], node['props']
        if kind == 'GeneratedView':
            artifacts.append(p['html'])
            return None
        result = {'id': key}
        if kind == 'Stack':
            children = [c for child in node['children'] if (c := convert(child))]
            result.update(component='Row' if p['direction'] == 'row' else 'Column', children=children)
        elif kind == 'Metric':
            result.update(component='Text', text=f"{p['label']}: {p['value']}", variant='h3')
        elif kind == 'Text':
            result.update(component='Text', text=p['text'])
        elif kind == 'Button':
            label = key + '-label'
            components.append({'id': label, 'component': 'Text', 'text': p['label']})
            result.update(component='Button', child=label, action={'event': {'name': p['action'], 'context': {}}})
        components.append(result)
        return key
    convert(spec['root'])
    return {'messages': [
        {'version': 'v0.9', 'createSurface': {'surfaceId': 'dashboard', 'catalogId': A2UI_CATALOG}},
        {'version': 'v0.9', 'updateComponents': {'surfaceId': 'dashboard', 'components': components}},
        {'version': 'v0.9', 'updateDataModel': {'surfaceId': 'dashboard', 'path': '/', 'value': {'scenario': 'synthetic'}}}],
        'artifacts': artifacts}


def openui(spec):
    """Forward references: root appears before the components it references."""
    lines = []
    for key in [spec['root']] + [k for k in spec['elements'] if k != spec['root']]:
        node = spec['elements'][key]
        args = ([f"[{', '.join(node['children'])}]", json.dumps(node['props']['direction'])]
                if node['type'] == 'Stack' else [json.dumps(v) for v in node['props'].values()])
        lines.append(f"{key} = {node['type']}({', '.join(args)})")
    return '\n'.join(lines)
