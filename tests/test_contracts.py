"""Behavioral checks for mode boundaries, validation, actions and real SDK paths."""
import copy
import json
import unittest
from fastapi.testclient import TestClient
from app.server import app
from app.core import MODES, TOPICS, replay, validate


class Contracts(unittest.TestCase):
    def test_all_topics_and_modes(self):
        with TestClient(app) as client:
            for topic in TOPICS:
                for mode in MODES:
                    with self.subTest(topic=topic, mode=mode):
                        r = client.post('/api/generate', json={'topic': topic, 'mode': mode, 'prompt': 'detailed dashboard'})
                        self.assertEqual(r.status_code, 200, r.text)
                        validate(r.json()['spec'])

    def test_mode_boundaries(self):
        self.assertEqual(replay('compact', 'static'), replay('detailed', 'static'))
        self.assertNotEqual(replay('compact', 'declarative'), replay('detailed', 'declarative'))
        for mode in MODES:
            kinds = {e['type'] for e in replay('dashboard', mode)['elements'].values()}
            self.assertEqual('GeneratedView' in kinds, mode in ('open-ended', 'mixed'))
        self.assertEqual({e['type'] for e in replay('dashboard', 'open-ended')['elements'].values()}, {'Stack', 'GeneratedView'})

    def test_reject_invalid_graphs_and_actions(self):
        original = replay('dashboard', 'static')
        for mutate in [lambda s: s['elements']['root']['children'].append('missing'),
                       lambda s: s['elements']['root']['children'].append('root'),
                       lambda s: s['elements']['ack']['props'].update(action='delete_all'),
                       lambda s: s['elements']['units'].update(type='script')]:
            spec = copy.deepcopy(original)
            mutate(spec)
            with self.assertRaises(ValueError):
                validate(spec)
        with TestClient(app) as c:
            self.assertEqual(c.post('/api/action/delete_all').status_code, 403)
            self.assertTrue(c.post('/api/action/acknowledge').json()['accepted'])

    def test_agui_lifecycle_and_state(self):
        with TestClient(app) as c:
            r = c.post('/api/agui', json={'topic': 'agui', 'mode': 'mixed', 'prompt': 'dashboard'})
            events = [json.loads(line[6:]) for line in r.text.splitlines() if line.startswith('data: ')]
            self.assertEqual(events[0]['type'], 'RUN_STARTED')
            self.assertEqual(events[-1]['type'], 'RUN_FINISHED')
            patch = next(e for e in events if e['type'] == 'STATE_DELTA')
            validate(patch['delta'][0]['value'])

    def test_mcp_resource_metadata_and_tool_execution(self):
        with TestClient(app) as c:
            tools = c.post('/api/mcp', json={'method': 'tools/list'}).json()['tools']
            tool = next(t for t in tools if t['name'] == 'show_dashboard')
            uri = tool['_meta']['ui']['resourceUri']
            resource = c.post('/api/mcp', json={'method': 'resources/read', 'params': {'uri': uri}}).json()
            self.assertEqual(resource['contents'][0]['mimeType'], 'text/html;profile=mcp-app')
            for mode in MODES:
                r = c.post('/api/mcp', json={'method': 'tools/call', 'params': {'name': 'show_dashboard', 'arguments': {'mode': mode}}}).json()
                self.assertFalse(r.get('isError'), r)
                validate(json.loads(r['content'][0]['text'])['spec'])
            self.assertEqual(c.post('/api/mcp', json={'method': 'tools/call', 'params': {'name': 'shell'}}).status_code, 403)


if __name__ == '__main__':
    unittest.main(verbosity=2)
