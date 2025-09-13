import urllib.request
import urllib.parse
import urllib.error
import json

# 测试创建文件夹API
data = json.dumps({'parent_path': '', 'name': 'test_folder'}).encode('utf-8')
req = urllib.request.Request('http://127.0.0.1:3737/api/folder', data=data, headers={'Content-Type': 'application/json'})

try:
    response = urllib.request.urlopen(req)
    print('Status Code:', response.getcode())
    print('Response:', response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('HTTP Error:', e.code)
    print('Response:', e.read().decode('utf-8'))
except Exception as e:
    print('Error:', str(e))