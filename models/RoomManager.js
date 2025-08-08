// models/RoomManager.js
'use strict';

const GameRoom = require('./GameRoom');

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.playerRooms = new Map(); // userId -> roomCode
    
    // Clean up old rooms every 30 minutes
    setInterval(() => {
      this.cleanupOldRooms();
    }, 30 * 60 * 1000);
    
    console.log('🏠 Room Manager initialized');
  }

  generateRoomCode() {
    let code;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      attempts++;
      
      if (attempts > maxAttempts) {
        throw new Error('Unable to generate unique room code');
      }
    } while (this.rooms.has(code));
    
    return code;
  }

  createRoom(hostId) {
    try {
      const code = this.generateRoomCode();
      
      // Debug: Check if GameRoom is a constructor
      if (typeof GameRoom !== 'function') {
        console.error('❌ GameRoom is not a constructor:', typeof GameRoom);
        throw new Error('GameRoom is not a constructor');
      }
      
      const room = new GameRoom(code, hostId);
      this.rooms.set(code, room);
      
      console.log(`🏠 Room ${code} created by host ${hostId}`);
      
      // Clean up old rooms
      this.cleanupOldRooms();
      
      return room;
    } catch (error) {
      console.error('Room creation error:', error.message);
      throw error;
    }
  }

  joinRoom(code, userId, username, socketId) {
    try {
      const room = this.rooms.get(code);
      if (!room) {
        throw new Error('Room not found');
      }
      
      // Remove player from any existing room first
      this.leaveCurrentRoom(userId);
      
      room.addPlayer(userId, username, socketId);
      this.playerRooms.set(userId, code);
      
      console.log(`👤 Player ${username} (${userId}) joined room ${code}`);
      
      return room;
    } catch (error) {
      console.error(`Join room error for user ${userId}:`, error.message);
      throw error;
    }
  }

  leaveRoom(userId) {
    try {
      const roomCode = this.playerRooms.get(userId);
      if (!roomCode) {
        return null;
      }
      
      const room = this.rooms.get(roomCode);
      if (!room) {
        // Clean up orphaned player room reference
        this.playerRooms.delete(userId);
        return null;
      }
      
      room.removePlayer(userId);
      this.playerRooms.delete(userId);
      
      console.log(`👋 Player ${userId} left room ${roomCode}`);
      
      // Delete room if empty
      if (room.players.size === 0) {
        this.rooms.delete(roomCode);
        console.log(`🗑️ Empty room ${roomCode} deleted`);
      }
      
      return room;
    } catch (error) {
      console.error(`Leave room error for user ${userId}:`, error.message);
      throw error;
    }
  }

  leaveCurrentRoom(userId) {
    return this.leaveRoom(userId);
  }

  getRoom(code) {
    return this.rooms.get(code);
  }

  getRoomByUserId(userId) {
    const roomCode = this.playerRooms.get(userId);
    return roomCode ? this.rooms.get(roomCode) : null;
  }

  getAllRooms() {
    return Array.from(this.rooms.values()).map(room => ({
      code: room.code,
      playerCount: room.players.size,
      maxPlayers: room.maxPlayers,
      status: room.status,
      createdAt: room.createdAt
    }));
  }

  getRoomStats() {
    const totalRooms = this.rooms.size;
    const activePlayers = this.playerRooms.size;
    const playingRooms = Array.from(this.rooms.values())
      .filter(room => room.status === 'playing').length;
    
    return {
      totalRooms,
      activePlayers,
      playingRooms,
      waitingRooms: totalRooms - playingRooms
    };
  }

  cleanupOldRooms() {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [code, room] of this.rooms.entries()) {
      if (room.createdAt < twoHoursAgo) {
        // Remove all players from tracking
        for (const playerId of room.players.keys()) {
          this.playerRooms.delete(playerId);
        }
        this.rooms.delete(code);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old rooms`);
    }
  }
}

// Export a singleton instance
module.exports = new RoomManager();