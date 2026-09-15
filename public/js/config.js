// Central Client Configuration and Utility Module
const AppConfig = {
  publicJoinUrl: window.location.origin + '/register.html',
  backendUrl:    window.location.origin,
  socketUrl:     window.location.origin,
  realtime:      'socket',  // 'socket' | 'polling' — updated by loadConfig()

  async loadConfig() {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data.publicJoinUrl) this.publicJoinUrl = data.publicJoinUrl;
        if (data.backendUrl)    this.backendUrl    = data.backendUrl;
        if (data.socketUrl)     this.socketUrl     = data.socketUrl;
        if (data.realtime)      this.realtime      = data.realtime;
      }
    } catch (err) {
      console.warn('Could not load remote config, using origin defaults:', err);
    }
  },


  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

window.AppConfig = AppConfig;
