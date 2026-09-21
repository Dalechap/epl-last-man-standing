self.addEventListener('push', event => {
  const data = event.data
    ? event.data.json()
    : {};

  const title =
    data.title || 'Last Man Standing';

  const options = {
    body: data.body || '',
    icon: '/EPL.jpg',
    badge: '/EPL.jpg',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const url =
    event.notification.data?.url || '/';

  event.waitUntil(
    clients.openWindow(url)
  );
});
