import { ref, onMounted, onUnmounted } from 'vue';
import { useRequestsStore } from '../stores/requests';
import { API_BASE_URL } from '../lib/api';

export function useProgressSocket() {
  const requestsStore = useRequestsStore();
  const socket = ref<WebSocket | null>(null);
  const isConnected = ref(false);

  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let retryDelay = 1000;
  let isManuallyClosed = false;

  function getWsUrl(): string {
    if (API_BASE_URL) {
      const url = API_BASE_URL.replace(/^http/, 'ws');
      return `${url}/ws`;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  function connect(): void {
    if (
      socket.value &&
      (socket.value.readyState === WebSocket.OPEN ||
        socket.value.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      const ws = new WebSocket(getWsUrl());
      socket.value = ws;

      ws.onopen = () => {
        isConnected.value = true;
        retryDelay = 1000;
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'progress') {
            requestsStore.handleProgressMessage(data);
          } else if (data.type === 'status') {
            requestsStore.handleStatusMessage(data);
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        isConnected.value = false;
        socket.value = null;

        if (!isManuallyClosed) {
          reconnectTimeout = setTimeout(() => {
            connect();
          }, retryDelay);
          retryDelay = Math.min(retryDelay * 1.5, 30000);
        }
      };

      ws.onerror = () => {
        // ws.close() will fire and trigger reconnect
      };
    } catch {
      if (!isManuallyClosed) {
        reconnectTimeout = setTimeout(() => {
          connect();
        }, retryDelay);
        retryDelay = Math.min(retryDelay * 1.5, 30000);
      }
    }
  }

  function disconnect(): void {
    isManuallyClosed = true;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (socket.value) {
      socket.value.close();
      socket.value = null;
    }
    isConnected.value = false;
  }

  onMounted(() => {
    isManuallyClosed = false;
    connect();
  });

  onUnmounted(() => {
    disconnect();
  });

  return {
    isConnected,
    connect,
    disconnect,
  };
}
