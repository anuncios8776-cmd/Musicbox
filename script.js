// Configuración de Supabase
const SUPABASE_URL = https://qgtbqxdqxazfjiqizfxg.supabase.co/rest/v1/;
const SUPABASE_ANON_KEY = sb_publishable_S6EyDHWJ04mcfxSacTKVag_I2HaB93-;

// Inicializar cliente de Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// Clase principal de la aplicación
class MusicApp {
    constructor() {
        this.audio = new Audio();
        this.songs = [];
        this.currentSongIndex = -1;
        this.isPlaying = false;
        this.db = null;
        
        this.init();
    }

    async uploadToCloud(file, metadata) {
       try {
            // 1. Generar un nombre único para evitar conflictos
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

         // 2. Subir el archivo MP3 al Storage de Supabase
            const { data: songData, error: songError } = await supabase.storage
                .from('music-box')
                .upload(`songs/${fileName}`, file);

        if (songError) throw songError;

        // 3. Obtener la URL pública del archivo subido
            const { data: { publicUrl: songUrl } } = supabase.storage
                .from('music-box')
                .getPublicUrl(`songs/${fileName}`);

        // 4. Guardar los METADATOS en la tabla 'songs' de la base de datos
            // de Supabase (PostgreSQL)
            const { data, error: dbError } = await supabase
                .from('songs')
                .insert([
                    {
                        title: metadata.title,
                        artist: metadata.artist,
                        album: metadata.album,
                        duration: metadata.duration,
                        song_url: songUrl,
                        // Si tuvieras una imagen de portada, la subirías igual

    }

    if (dbError) throw dbError;
            
            console.log('Canción subida a la nube exitosamente');
            return true;
            
        } catch (error) {
            console.error('Error al subir a la nube:', error);
            return false;
        }
    }
 
    // Función para obtener canciones desde la nube (¡el streaming es automático!)
    async loadSongsFromCloud() {
        const { data, error } = await supabase
            .from('songs')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) {
            console.error('Error cargando canciones:', error);
            return [];
        }
        
        return data;
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MusicBoxDB', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('songs')) {
                    const store = db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('title', 'title', { unique: false });
                }
            };
        });
    }

    async saveSongToDB(file, title, artist) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                const audioData = e.target.result;
                
                // Crear objeto de audio para obtener duración
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const arrayBuffer = await file.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                const duration = this.formatTime(audioBuffer.duration);

                const song = {
                    title: title || file.name.replace(/\.[^/.]+$/, ""),
                    artist: artist || 'Artista desconocido',
                    data: audioData,
                    fileName: file.name,
                    duration: duration,
                    dateAdded: new Date().toISOString()
                };

                const transaction = this.db.transaction(['songs'], 'readwrite');
                const store = transaction.objectStore('songs');
                const request = store.add(song);

                request.onsuccess = () => {
                    this.loadSongs();
                    resolve(request.result);
                };

                request.onerror = () => reject(request.error);
            };

            reader.readAsDataURL(file);
        });
    }

    async loadSongs() {
        return new Promise((resolve, reject) => {
            if (!this.db) return;

            const transaction = this.db.transaction(['songs'], 'readonly');
            const store = transaction.objectStore('songs');
            const request = store.getAll();

            request.onsuccess = () => {
                this.songs = request.result;
                this.renderSongList();
                resolve(this.songs);
            };

            request.onerror = () => reject(request.error);
        });
    }

    async deleteSong(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['songs'], 'readwrite');
            const store = transaction.objectStore('songs');
            const request = store.delete(id);

            request.onsuccess = () => {
                if (this.currentSongIndex !== -1 && this.songs[this.currentSongIndex]?.id === id) {
                    this.stop();
                }
                this.loadSongs();
                resolve();
            };

            request.onerror = () => reject(request.error);
        });
    }

    initElements() {
        // Elementos del DOM
        this.elements = {
            playPauseBtn: document.getElementById('playPauseBtn'),
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn'),
            progressBar: document.getElementById('progressBar'),
            progress: document.getElementById('progress'),
            currentTime: document.getElementById('currentTime'),
            totalTime: document.getElementById('totalTime'),
            volumeSlider: document.getElementById('volumeSlider'),
            volumeIcon: document.getElementById('volumeIcon'),
            songTitle: document.querySelector('.song-title'),
            songArtist: document.querySelector('.song-artist'),
            songList: document.getElementById('songList'),
            addSongBtn: document.getElementById('addSongBtn'),
            addSongModal: document.getElementById('addSongModal'),
            closeModalBtn: document.getElementById('closeModalBtn'),
            cancelBtn: document.getElementById('cancelBtn'),
            saveBtn: document.getElementById('saveBtn'),
            fileInput: document.getElementById('fileInput'),
            fileInfo: document.getElementById('fileInfo'),
            menuBtn: document.getElementById('menuBtn'),
            fullscreenPlayer: document.getElementById('fullscreenPlayer'),
            closeFullscreen: document.getElementById('closeFullscreen'),
            fullscreenPlayPause: document.getElementById('fullscreenPlayPause'),
            fullscreenPrev: document.getElementById('fullscreenPrev'),
            fullscreenNext: document.getElementById('fullscreenNext'),
            fullscreenTitle: document.getElementById('fullscreenTitle'),
            fullscreenArtist: document.getElementById('fullscreenArtist'),
            fullProgressBar: document.getElementById('fullProgressBar'),
            fullProgress: document.getElementById('fullProgress'),
            fullCurrentTime: document.getElementById('fullCurrentTime'),
            fullTotalTime: document.getElementById('fullTotalTime'),
            albumArt: document.getElementById('albumArt'),
            largeAlbumArt: document.getElementById('largeAlbumArt')
        };
    }

    initEvents() {
        // Eventos de reproducción
        this.elements.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.elements.prevBtn.addEventListener('click', () => this.playPrevious());
        this.elements.nextBtn.addEventListener('click', () => this.playNext());
        
        // Eventos de tiempo
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.updateTotalTime());
        this.audio.addEventListener('ended', () => this.playNext());
        
        // Eventos de volumen
        this.elements.volumeSlider.addEventListener('input', (e) => {
            this.audio.volume = e.target.value;
            this.updateVolumeIcon();
        });
        
        // Evento de barra de progreso
        this.elements.progressBar.addEventListener('click', (e) => {
            const rect = e.target.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            this.audio.currentTime = pos * this.audio.duration;
        });

        this.elements.fullProgressBar.addEventListener('click', (e) => {
            const rect = e.target.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            this.audio.currentTime = pos * this.audio.duration;
        });

        // Eventos del modal
        this.elements.addSongBtn.addEventListener('click', () => this.openModal());
        this.elements.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.elements.cancelBtn.addEventListener('click', () => this.closeModal());
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.elements.saveBtn.addEventListener('click', () => this.uploadFiles());

        // Eventos del reproductor fullscreen
        this.elements.menuBtn.addEventListener('click', () => this.toggleFullscreen());
        this.elements.closeFullscreen.addEventListener('click', () => this.toggleFullscreen());
        this.elements.fullscreenPlayPause.addEventListener('click', () => this.togglePlay());
        this.elements.fullscreenPrev.addEventListener('click', () => this.playPrevious());
        this.elements.fullscreenNext.addEventListener('click', () => this.playNext());
        this.elements.albumArt.addEventListener('click', () => this.toggleFullscreen());
        this.elements.largeAlbumArt.addEventListener('click', () => this.toggleFullscreen());

        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target === this.elements.addSongModal) {
                this.closeModal();
            }
        });
    }

    togglePlay() {
        if (this.currentSongIndex === -1 && this.songs.length > 0) {
            this.playSong(0);
        } else if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        this.audio.play();
        this.isPlaying = true;
        this.updatePlayButtons();
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayButtons();
    }

    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
        this.currentSongIndex = -1;
        this.updatePlayButtons();
        this.elements.songTitle.textContent = 'No hay canción';
        this.elements.songArtist.textContent = 'Selecciona o sube una canción';
        this.elements.fullscreenTitle.textContent = 'No hay canción';
        this.elements.fullscreenArtist.textContent = 'Selecciona o sube una canción';
    }

    // Modifica la función playSong para que funcione con la URL de la nube
    async playSongFromCloud(song) {
    // song.song_url es la URL pública que obtuvimos de Supabase
            
            this.audio.src = song.song_url; // ¡Streaming directo desde la CDN!
            this.audio.play();
            this.isPlaying = true;
            
            this.elements.songTitle.textContent = song.title;
            this.elements.songArtist.textContent = song.artist;
            this.elements.fullscreenTitle.textContent = song.title;
            this.elements.fullscreenArtist.textContent = song.artist;
            
            this.updatePlayButtons();
            this.renderSongList();
        }
    }

    playPrevious() {
        if (this.songs.length > 0) {
            let newIndex = this.currentSongIndex - 1;
            if (newIndex < 0) newIndex = this.songs.length - 1;
            this.playSong(newIndex);
        }
    }

    playNext() {
        if (this.songs.length > 0) {
            let newIndex = this.currentSongIndex + 1;
            if (newIndex >= this.songs.length) newIndex = 0;
            this.playSong(newIndex);
        }
    }

    updateProgress() {
        if (this.audio.duration) {
            const progress = (this.audio.currentTime / this.audio.duration) * 100;
            this.elements.progress.style.width = progress + '%';
            this.elements.fullProgress.style.width = progress + '%';
            
            this.elements.currentTime.textContent = this.formatTime(this.audio.currentTime);
            this.elements.fullCurrentTime.textContent = this.formatTime(this.audio.currentTime);
        }
    }

    updateTotalTime() {
        this.elements.totalTime.textContent = this.formatTime(this.audio.duration);
        this.elements.fullTotalTime.textContent = this.formatTime(this.audio.duration);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    updateVolumeIcon() {
        if (this.audio.volume === 0) {
            this.elements.volumeIcon.className = 'fas fa-volume-mute';
        } else if (this.audio.volume < 0.5) {
            this.elements.volumeIcon.className = 'fas fa-volume-down';
        } else {
            this.elements.volumeIcon.className = 'fas fa-volume-up';
        }
    }

    updatePlayButtons() {
        const icon = this.isPlaying ? 'pause' : 'play';
        this.elements.playPauseBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
        this.elements.fullscreenPlayPause.innerHTML = `<i class="fas fa-${icon}"></i>`;
    }

    toggleFullscreen() {
        this.elements.fullscreenPlayer.classList.toggle('show');
    }

    openModal() {
        this.elements.addSongModal.classList.add('show');
        this.elements.fileInput.value = '';
        this.elements.fileInfo.innerHTML = '';
        this.elements.saveBtn.disabled = true;
    }

    closeModal() {
        this.elements.addSongModal.classList.remove('show');
        this.elements.fileInput.value = '';
        this.elements.fileInfo.innerHTML = '';
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            let info = `<strong>Archivos seleccionados:</strong><br>`;
            for (let file of files) {
                info += `🎵 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)<br>`;
            }
            this.elements.fileInfo.innerHTML = info;
            this.elements.saveBtn.disabled = false;
        }
    }

    async uploadFiles() {
        const files = this.elements.fileInput.files;
        this.elements.saveBtn.disabled = true;
        this.elements.saveBtn.textContent = 'Subiendo...';

        for (let file of files) {
            if (file.type.startsWith('audio/')) {
                await this.saveSongToDB(file);
            }
        }

        this.elements.saveBtn.textContent = 'Subir';
        this.closeModal();
    }

    renderSongList() {
        if (this.songs.length === 0) {
            this.elements.songList.innerHTML = `
                <li class="empty-state">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>No hay canciones. ¡Sube tu primera canción!</p>
                </li>
            `;
            return;
        }

        let html = '';
        this.songs.forEach((song, index) => {
            const isActive = index === this.currentSongIndex;
            html += `
                <li class="${isActive ? 'active' : ''}" data-index="${index}">
                    <div class="song-icon">
                        <i class="fas fa-music"></i>
                    </div>
                    <div class="song-details">
                        <div class="song-name">${song.title}</div>
                        <div class="song-artist-name">${song.artist}</div>
                    </div>
                    <div class="song-duration">${song.duration || '0:00'}</div>
                    <button class="delete-btn" onclick="app.deleteSongFromList(${song.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </li>
            `;
        });

        this.elements.songList.innerHTML = html;

        // Agregar eventos click a las canciones
        document.querySelectorAll('.song-list li[data-index]').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-btn')) {
                    const index = parseInt(item.dataset.index);
                    this.playSong(index);
                }
            });
        });
    }

    async deleteSongFromList(id) {
        if (confirm('¿Eliminar esta canción?')) {
            await this.deleteSong(id);
        }
    }

    updateUI() {
        // Actualización inicial de la UI
        this.audio.volume = this.elements.volumeSlider.value;
    }
}

// Inicializar la aplicación
const app = new MusicApp();