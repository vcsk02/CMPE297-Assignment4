"""Official AG-UI event models and encoder; the UI format stays separate."""
import json
import uuid
from ag_ui.core import (RunStartedEvent, RunFinishedEvent, StateSnapshotEvent,
                        StateDeltaEvent, ToolCallStartEvent, ToolCallArgsEvent, ToolCallEndEvent)
from ag_ui.encoder import EventEncoder


def events(spec, thread='demo-thread'):
    run = str(uuid.uuid4())
    yield RunStartedEvent(thread_id=thread, run_id=run)
    yield StateSnapshotEvent(snapshot={'ui': None, 'status': 'building'})
    yield ToolCallStartEvent(tool_call_id='render-1', tool_call_name='render_ui')
    yield ToolCallArgsEvent(tool_call_id='render-1', delta=json.dumps({'spec': spec}))
    yield ToolCallEndEvent(tool_call_id='render-1')
    yield StateDeltaEvent(delta=[{'op': 'replace', 'path': '/ui', 'value': spec},
                                 {'op': 'replace', 'path': '/status', 'value': 'ready'}])
    yield RunFinishedEvent(thread_id=thread, run_id=run)


def encode(spec):
    encoder = EventEncoder(accept='text/event-stream')
    return [encoder.encode(e) for e in events(spec)]
