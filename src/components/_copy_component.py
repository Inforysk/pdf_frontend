import re

with open('SolicitudesView.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Cambiar nombre del componente
content = content.replace('export default function SolicitudesView', 'export default function PedidosSolicitudesView')

# Cambiar endpoints de API - más específicos primero
content = content.replace('/api/solicitudes/stats', '/api/pedidos-solicitudes/stats')
content = content.replace('/api/solicitudes/export', '/api/pedidos-solicitudes/export')

# Reemplazar patrones con regex
content = re.sub(r"'/api/solicitudes'", "'/api/pedidos-solicitudes'", content)
content = re.sub(r'"/api/solicitudes"', '"/api/pedidos-solicitudes"', content)
content = re.sub(r'/api/solicitudes\?', '/api/pedidos-solicitudes?', content)
content = re.sub(r'/api/solicitudes/', '/api/pedidos-solicitudes/', content)
content = re.sub(r'`/api/solicitudes', '`/api/pedidos-solicitudes', content)

with open('PedidosSolicitudesView.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Componente copiado y adaptado')
print(f'Lineas: {len(content.splitlines())}')
