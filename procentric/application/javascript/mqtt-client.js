/**
 * MQTT Client Module for ProCentric LG TV Application
 * With subscription and command handling
 */

var MqttClient = {
    client: null,
    isConnected: false,
    reconnectTimer: null,
    reconnectAttempts: 0,
    config: null,
    deviceSrNo: null,
    subscribedTopic: null
};

/**
 * Initialize MQTT connection
 */
MqttClient.init = function(mqttSettings, deviceSerialNumber) {
    if (!mqttSettings || !mqttSettings.broker) {
        console.error('[MQTT] Invalid MQTT settings provided');
        return;
    }

    if (!deviceSerialNumber) {
        console.error('[MQTT] Device serial number is required');
        return;
    }

    this.config = mqttSettings;
    this.deviceSrNo = deviceSerialNumber;

    console.log('[MQTT] Initializing MQTT client...');
    console.log('[MQTT] Broker:', this.config.broker.host);
    console.log('[MQTT] Device Serial:', this.deviceSrNo);

    this.connect();
};

/**
 * Establish MQTT connection
 */
MqttClient.connect = function() {
    try {
        var broker = this.config.broker;
        var auth = this.config.authentication;
        
        // Generate unique client ID
        var clientId = 'GRE_TV_' + this.deviceSrNo + '_' + Date.now();

        // WebSocket configuration
        var wsHost = broker.host;
        var wsPort = 8084; // Static secure WebSocket port
        var wsPath = '/mqtt';
        
        console.log('[MQTT] Creating client...');
        console.log('[MQTT] Host:', wsHost);
        console.log('[MQTT] Port:', wsPort);
        console.log('[MQTT] Path:', wsPath);
        console.log('[MQTT] Client ID:', clientId);

        // CORRECT Paho MQTT Client instantiation for WebSockets
        // Syntax: new Paho.MQTT.Client(hostname, port, path, clientId)
        this.client = new Paho.MQTT.Client(wsHost, wsPort, wsPath, clientId);

        // Set up callback handlers BEFORE connecting
        var self = this;
        
        this.client.onConnectionLost = function(responseObject) {
            self.onConnectionLost(responseObject);

        };
        this.client.onMessageArrived = function(message) {
            console.log("messages------------------------>", message);
            self.onMessageArrived(message);
        };

        // Prepare connection options
        var connectOptions = {
            useSSL: true, // CRITICAL: Must be true for wss://
            timeout: 30,
            keepAliveInterval: broker.keep_alive || 60,
            cleanSession: this.config.clean_session !== false,
            mqttVersion: 4, // Use MQTT 3.1.1
            onSuccess: function() {
                self.onConnect();
            },
            onFailure: function(error) {
                self.onConnectFailure(error);
            }
        };

        // Add authentication if provided
        if (auth && auth.username) {
            connectOptions.userName = auth.username;
            console.log('[MQTT] Username:', auth.username);
        }
        if (auth && auth.password) {
            connectOptions.password = auth.password;
            console.log('[MQTT] Password: [HIDDEN]');
        }

        // Add Last Will and Testament
        if (this.config.last_will && this.config.last_will.topic) {
            var lwt = this.config.last_will;
            var lwtTopic = lwt.topic.replace('{DeviceSrNo}', this.deviceSrNo);
            
            // Prepare LWT message
            var lwtMessage = lwt.message || {};
            if (typeof lwtMessage === 'object') {
                if (lwtMessage.responce && lwtMessage.responce.sr_no) {
                    lwtMessage.responce.sr_no = this.deviceSrNo;
                }
                lwtMessage = JSON.stringify(lwtMessage);
            }

            var willMessage = new Paho.MQTT.Message(lwtMessage);
            willMessage.destinationName = lwtTopic;
            willMessage.qos = lwt.qos || 1;
            willMessage.retained = lwt.retain === true;

            connectOptions.willMessage = willMessage;

            console.log('[MQTT] Last Will Topic:', lwtTopic);
            console.log('[MQTT] Last Will QoS:', willMessage.qos);
        }

        console.log('[MQTT] Attempting to connect with useSSL:', connectOptions.useSSL);
        this.client.connect(connectOptions);

    } catch (error) {
        console.error('[MQTT] Connection error:', error);
        console.error('[MQTT] Error stack:', error.stack);
        this.scheduleReconnect();
    }
};

/**
 * Connection success callback
 */
MqttClient.onConnect = function() {
    console.log('[MQTT] ✅ Connected successfully!');
    console.log('[MQTT] Client connected to broker');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Clear any pending reconnect timers
    if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
    }

    console.log("called---------------------------------------->")

    // Subscribe to command topic after successful connection
    this.subscribeToCommandTopic();
};

/**
 * Subscribe to command topic
 */
MqttClient.subscribeToCommandTopic = function() {
    if (!this.client || !this.isConnected) {
        console.error('[MQTT] Cannot subscribe - client not connected');
        return;
    }

    // Build topic: GRE/{DeviceSrNo}/CMD
    var topic = 'GRE/' + this.deviceSrNo + '/CMD';
    this.subscribedTopic = topic;

    console.log('[MQTT] 📥 Subscribing to topic:', topic);

    var self = this;
    
    try {
        this.client.subscribe(topic, {
            qos: 1,
            onSuccess: function() {
                console.log('[MQTT] ✅ Successfully subscribed to:', topic);
            },
            onFailure: function(error) {
                console.error('[MQTT] ❌ Subscription failed:', error.errorMessage);
                console.error('[MQTT] Error code:', error.errorCode);
                
                // Retry subscription after delay
                setTimeout(function() {
                    self.subscribeToCommandTopic();
                }, 5000);
            }
        });
    } catch (error) {
        console.error('[MQTT] Subscribe exception:', error);
    }
};

/**
 * Handle incoming MQTT messages
 */
MqttClient.onMessageArrived = function(message) {
    console.log('[MQTT] 📨 Message arrived on topic:', message);
    console.log('[MQTT] Message payload:', message.payloadString);
    
    try {
        // Parse the incoming message
        var payload = JSON.parse(message.payloadString);
        
        console.log('[MQTT] Parsed command:', payload);
        
        // Validate payload structure
        if (!payload.cmd || typeof payload.seq === 'undefined') {
            console.warn('[MQTT] Invalid command format - missing cmd or seq');
            return;
        }

        // Process the command and send response to backend
        this.processCommand(payload);
        
    } catch (error) {
        console.error('[MQTT] Error processing message:', error);
        console.error('[MQTT] Raw payload:', message.payloadString);
    }
};

/**
 * Process MQTT command and send response to backend API
 */
MqttClient.processCommand = function(command) {
    console.log('[MQTT] Processing command:', command.cmd);
    
    var self = this;
    
    // 🔥 IMMEDIATELY send acknowledgment to backend API that command was received
    console.log('[MQTT] ✅ Command received, sending to backend API immediately');
    
    // Prepare response data - EXACT format as required (no extra fields)
    var responseData = {
        cmd: command.cmd,
        responce: {
            cmd_status: true,
            sr_no: this.deviceSrNo,
            message: ""
        },
        seq: String(command.seq)
    };
    
    // Send to backend API immediately
    this.sendCommandToBackend(responseData, command);
};

/**
 * Send command data to backend API immediately upon receipt
 */
MqttClient.sendCommandToBackend = function(responseData, originalCommand) {
    console.log('[MQTT] 📤 Sending command to backend API');
    console.log('[MQTT] Response payload:', JSON.stringify(responseData));
    
    // Check if required globals are available
    if (typeof macro === 'undefined' || typeof apiPrefixUrl === 'undefined' || typeof pageDetails === 'undefined') {
        console.error('[MQTT] Required globals not available - cannot send API request');
        console.error('[MQTT] macro defined:', typeof macro !== 'undefined');
        console.error('[MQTT] apiPrefixUrl defined:', typeof apiPrefixUrl !== 'undefined');
        console.error('[MQTT] pageDetails defined:', typeof pageDetails !== 'undefined');
        return;
    }
    
    var self = this;
    
    // Send to backend
    macro.ajax({
        url: apiPrefixUrl + "device-mqtt-cmd",
        type: "POST",
        data: JSON.stringify(responseData),
        contentType: "application/json; charset=utf-8",
        headers: {
            "Authorization": "Bearer " + (pageDetails && pageDetails.access_token ? pageDetails.access_token : "")
        },
        success: function(data) {
            console.log('[MQTT] ✅ Command sent to backend successfully');
            console.log('[MQTT] Backend response:', data);
            
            // Now execute the actual command after successful backend notification
            self.executeCommand(originalCommand);
        },
        error: function(err) {
            console.error('[MQTT] ❌ Backend API error:', err);
            console.error('[MQTT] Error status:', err.status);
            console.error('[MQTT] Error text:', err.statusText);
            
            // Still try to execute command even if backend fails
            console.warn('[MQTT] Executing command despite backend API failure');
            self.executeCommand(originalCommand);
        },
        timeout: 60000
    });
};

/**
 * Execute the actual command functionality (optional - after backend notification)
 */
MqttClient.executeCommand = function(command) {
    console.log('[MQTT] 🔧 Executing command locally:', command.cmd);
    
    try {
        switch (command.cmd) {
            case 'set_volume':
                if (command.payload && typeof command.payload.volume !== 'undefined') {
                    console.log('[MQTT] Setting volume to:', command.payload.volume);
                    // TODO: Implement actual volume setting logic here
                    // Example:
                    // if (window.hcap && hcap.audio && hcap.audio.setVolume) {
                    //     hcap.audio.setVolume({
                    //         volume: command.payload.volume,
                    //         onSuccess: function() {
                    //             console.log('[MQTT] Volume set successfully');
                    //         },
                    //         onFailure: function(err) {
                    //             console.error('[MQTT] Volume set failed:', err);
                    //         }
                    //     });
                    // }
                } else {
                    console.warn('[MQTT] Invalid volume payload');
                }
                break;
                
            case 'ping':
                console.log('[MQTT] Ping command - no action needed');
                break;
                
            case 'get_status':
                console.log('[MQTT] Get status command - no action needed');
                break;
                
            default:
                console.warn('[MQTT] Unknown command, no execution handler:', command.cmd);
        }
    } catch (error) {
        console.error('[MQTT] Command execution error:', error);
    }
};

/**
 * Connection failure callback
 */
MqttClient.onConnectFailure = function(error) {
    console.error('[MQTT] ❌ Connection failed');
    console.error('[MQTT] Error code:', error.errorCode);
    console.error('[MQTT] Error message:', error.errorMessage);
    
    this.isConnected = false;
    this.scheduleReconnect();
};

/**
 * Connection lost callback
 */
MqttClient.onConnectionLost = function(responseObject) {
    this.isConnected = false;
    this.subscribedTopic = null;
    
    console.warn('[MQTT] ⚠️ Connection lost');
    console.warn('[MQTT] Error code:', responseObject.errorCode);
    console.warn('[MQTT] Error message:', responseObject.errorMessage);
    
    if (responseObject.errorCode !== 0) {
        this.scheduleReconnect();
    } else {
        console.log('[MQTT] Disconnected normally');
    }
};

/**
 * Schedule reconnection attempt
 */
MqttClient.scheduleReconnect = function() {
    var reconnectConfig = this.config.reconnect;
    
    if (!reconnectConfig || !reconnectConfig.is_auto_reconnect) {
        console.log('[MQTT] Auto-reconnect disabled');
        return;
    }

    var maxAttempts = reconnectConfig.max_attempts || 5;
    
    if (this.reconnectAttempts >= maxAttempts) {
        console.error('[MQTT] Max reconnection attempts (' + maxAttempts + ') reached');
        return;
    }

    this.reconnectAttempts++;
    var interval = (reconnectConfig.interval || 5) * 1000;

    console.log('[MQTT] 🔄 Scheduling reconnect attempt ' + this.reconnectAttempts + ' in ' + (interval / 1000) + ' seconds');

    if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
    }

    var self = this;
    this.reconnectTimer = setTimeout(function() {
        console.log('[MQTT] Executing reconnect attempt ' + self.reconnectAttempts);
        self.connect();
    }, interval);
};

/**
 * Disconnect from MQTT broker
 */
MqttClient.disconnect = function() {
    console.log('[MQTT] Disconnecting...');
    
    if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
    }

    if (this.client && this.isConnected) {
        try {
            // Unsubscribe before disconnecting
            if (this.subscribedTopic) {
                this.client.unsubscribe(this.subscribedTopic);
                console.log('[MQTT] Unsubscribed from:', this.subscribedTopic);
            }
            
            this.client.disconnect();
            console.log('[MQTT] Disconnected successfully');
        } catch (error) {
            console.error('[MQTT] Disconnect error:', error);
        }
    }

    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.subscribedTopic = null;
};

/**
 * Get connection status
 */
MqttClient.getStatus = function() {
    return {
        isConnected: this.isConnected,
        reconnectAttempts: this.reconnectAttempts,
        deviceSrNo: this.deviceSrNo,
        broker: this.config ? this.config.broker.host : null,
        subscribedTopic: this.subscribedTopic
    };
};

/**
 * Check if client is ready
 */
MqttClient.isReady = function() {
    return this.client !== null && this.isConnected;
};