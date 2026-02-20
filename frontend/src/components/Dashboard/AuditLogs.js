import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { ArrowLeft, AlertTriangle, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuditLogs = ({ onBack }) => {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      const response = await axios.get(`${API}/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'screenshot_attempt':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case 'login':
        return <Eye className="w-4 h-4 text-primary" />;
      default:
        return <Eye className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatEventType = (eventType) => {
    return eventType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="flex flex-col h-screen bg-background" data-testid="audit-logs">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="back-from-logs-button">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Security Audit Logs
            </h2>
            <p className="text-xs text-muted-foreground">Monitor security events and screenshot attempts</p>
          </div>
        </div>
      </div>

      {/* Logs */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No security events logged yet</p>
            </div>
          ) : (
            <div className="bg-black/90 border border-white/10 rounded-lg p-4 font-mono text-sm text-green-400 overflow-x-auto shadow-inner">
              {logs.map((log, index) => {
                const timestamp = new Date(log.timestamp);
                let deviceInfo = {};
                
                try {
                  deviceInfo = log.device_info ? JSON.parse(log.device_info) : {};
                } catch (e) {
                  deviceInfo = { raw: log.device_info };
                }

                return (
                  <div
                    key={log.id}
                    className="block border-b border-white/5 py-3 last:border-0 hover:bg-white/5 transition-colors"
                    data-testid={`audit-log-${index}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-green-500 flex-shrink-0">[{timestamp.toLocaleTimeString()}]</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getEventIcon(log.event_type)}
                          <span className="text-yellow-400 font-semibold">
                            {formatEventType(log.event_type)}
                          </span>
                        </div>
                        <div className="text-xs text-green-300/70 space-y-1">
                          <div>Time: {formatDistanceToNow(timestamp, { addSuffix: true })}</div>
                          {log.chat_id && <div>Chat ID: {log.chat_id.substring(0, 8)}...</div>}
                          {deviceInfo.method && <div>Method: {deviceInfo.method}</div>}
                          {deviceInfo.platform && <div>Platform: {deviceInfo.platform}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AuditLogs;