"""A bounded tool loop: propose -> validate -> execute -> observe -> finish."""
from app.core import generate, validate


def run(prompt, mode):
    spec, provider = generate(prompt, mode)
    history = [{'role': 'user', 'content': prompt},
               {'role': 'assistant', 'tool_call': {'name': 'render_ui', 'arguments': {'spec': spec}}}]
    tools = {'render_ui': lambda spec: {'rendered': True, 'spec': validate(spec)}}
    call = history[-1]['tool_call']
    result = tools[call['name']](**call['arguments'])
    history.append({'role': 'tool', 'name': call['name'], 'result': result})
    history.append({'role': 'assistant', 'content': 'Dashboard ready. Awaiting an authorized user action.'})
    return {'spec': result['spec'], 'provider': provider, 'history': history,
            'budget': {'tool_calls': 1, 'maximum': 1}}
