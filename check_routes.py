from backend.app import create_app

app = create_app()

print('Routes:')
for rule in app.url_map.iter_rules():
    print(rule)