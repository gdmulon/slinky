class Slinky {
  constructor(numRings = 15) {
    this.container = document.getElementById('slinky-container');
    this.modeToggleBtn = document.getElementById('mode-toggle');
    this.customizeToggleBtn = document.getElementById('customize-toggle');
    this.customizeMenu = document.getElementById('customize-menu');
    this.closeMenuBtn = document.getElementById('close-menu');
    this.color1Input = document.getElementById('color1');
    this.color2Input = document.getElementById('color2');
    this.patternSelect = document.getElementById('pattern-select');
    
    this.rings = [];
    this.mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.points = [];
    this.sticks = [];
    this.numRings = numRings;
    this.gravity = 1.0;
    this.friction = 0.99;
    this.bounce = 0.8;
    this.ringSpacing = 4;
    this.horizontalOffset = 3;
    this.gravitySlider = document.getElementById('gravity-slider');
    this.gravityValue = document.getElementById('gravity-value');
    
    this.isDragging = false;
    this.draggedPointIndex = null;
    this.isFollowMode = true;
    
    // Color and pattern properties
    this.color1 = '#ff6b6b';
    this.color2 = '#6b8eff';
    this.pattern = 'gradient';
    
    // Preview properties
    this.previewContainer = document.getElementById('preview-container');
    this.previewRings = [];
    
    this.rainbowToggle = document.getElementById('rainbow-toggle');
    this.defaultRainbowToggle = document.getElementById('default-rainbow');
    this.rainbowColorsSection = document.getElementById('rainbow-colors');
    this.rainbowInputs = Array.from(document.querySelectorAll('.rainbow-color'));
    
    // Rainbow properties
    this.isRainbow = false;
    this.useDefaultRainbow = false;
    this.rainbowColors = [
      '#ff0000', '#ff7f00', '#ffff00', 
      '#00ff00', '#8787ff', '#4b0082', 
      '#9400d3'
    ];
    
    // Add advanced mode properties
    this.advancedToggle = document.getElementById('advanced-toggle');
    this.advancedColorsContainer = document.getElementById('advanced-colors');
    this.advancedColorsGrid = document.querySelector('.advanced-colors-grid');
    this.basicControls = document.getElementById('basic-controls');
    this.isAdvancedMode = false;
    this.individualColors = Array(this.numRings).fill('#ff6b6b');
    
    this.resetButton = document.getElementById('reset-button');
    this.spacingSlider = document.getElementById('spacing-slider');
    this.spacingValue = document.getElementById('spacing-value');
    
    this.initialRingSpacing = 8;  
    this.ringSpacing = this.initialRingSpacing;
    
    this.init();
    this.initAdvancedControls();
    this.bindEvents();
    this.animate();
  }

  init() {
    // Clear existing rings and points if any
    this.container.innerHTML = '';
    this.rings = [];
    this.points = [];
    this.sticks = [];
    
    for (let i = 0; i < this.numRings; i++) {
      const ring = document.createElement('div');
      ring.className = 'slinky-ring';
      this.container.appendChild(ring);
      this.rings.push(ring);
      
      this.points.push({
        x: this.mousePos.x + (i * this.horizontalOffset),
        y: this.mousePos.y,
        oldX: this.mousePos.x + (i * this.horizontalOffset),
        oldY: this.mousePos.y
      });

      if (i > 0) {
        this.sticks.push({
          p0: this.points[i - 1],
          p1: this.points[i],
          length: this.ringSpacing 
        });
      }
    }
  }

  initAdvancedControls() {
    this.advancedColorsGrid.innerHTML = '';
    for (let i = 0; i < this.numRings; i++) {
      const colorInput = document.createElement('div');
      colorInput.className = 'advanced-color-input';
      
      const label = document.createElement('label');
      label.textContent = `Ring ${i + 1}:`;
      
      const input = document.createElement('input');
      input.type = 'color';
      input.value = this.individualColors[i];
      input.dataset.index = i;
      
      input.addEventListener('input', (e) => {
        this.individualColors[e.target.dataset.index] = e.target.value;
        this.updatePreview();
      });
      
      colorInput.appendChild(label);
      colorInput.appendChild(input);
      this.advancedColorsGrid.appendChild(colorInput);
    }
  }

  bindEvents() {
    this.initPreview();
    
    // Mouse move event
    document.addEventListener('mousemove', (e) => {
      this.handlePointerMove(e.clientX, e.clientY);
    });

    // Touch move event
    document.addEventListener('touchmove', (e) => {
      e.preventDefault(); // Prevent scrolling
      const touch = e.touches[0];
      this.handlePointerMove(touch.clientX, touch.clientY);
    }, { passive: false });

    this.modeToggleBtn.addEventListener('click', () => {
      this.isFollowMode = !this.isFollowMode;
      this.container.style.cursor = this.isFollowMode ? 'none' : 'grab';
      
      // Reset all points' velocities when switching modes
      this.points.forEach(point => {
        point.oldX = point.x;
        point.oldY = point.y;
      });
      
      this.modeToggleBtn.textContent = this.isFollowMode ? 'Drag Mode' : 'Follow Mode';
      this.modeToggleBtn.classList.toggle('drag-mode', !this.isFollowMode);
      
      this.isDragging = false;
      this.draggedPointIndex = null;
      
      // Update cursor styles for all rings
      this.rings.forEach(ring => {
        ring.style.cursor = this.isFollowMode ? 'none' : 'grab';
      });
    });

    this.customizeToggleBtn.addEventListener('click', () => {
      this.customizeMenu.classList.remove('hidden');
      this.updatePreview();
    });

    this.closeMenuBtn.addEventListener('click', () => {
      this.customizeMenu.classList.add('hidden');
    });

    this.color1Input.addEventListener('input', (e) => {
      this.color1 = e.target.value;
    });

    this.color2Input.addEventListener('input', (e) => {
      this.color2 = e.target.value;
    });

    this.patternSelect.addEventListener('change', (e) => {
      this.pattern = e.target.value;
    });

    // Combine mouse and touch down events
    const handlePointerDown = (x, y) => {
      if (!this.isFollowMode) {
        const rect = this.container.getBoundingClientRect();
        const touchX = x - rect.left;
        const touchY = y - rect.top;
        
        let closestDist = Infinity;
        let closestIndex = -1;
        
        this.points.forEach((point, index) => {
          const dx = point.x - x;
          const dy = point.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < closestDist && dist < 50) { 
            closestDist = dist;
            closestIndex = index;
          }
        });
        
        if (closestIndex !== -1) {
          this.isDragging = true;
          this.draggedPointIndex = closestIndex;
          this.rings[closestIndex].style.cursor = 'grabbing';
        }
      }
    };

    document.addEventListener('mousedown', (e) => {
      handlePointerDown(e.clientX, e.clientY);
    });

    document.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      handlePointerDown(touch.clientX, touch.clientY);
    });

    // Combine mouse and touch up events
    const handlePointerUp = () => {
      if (this.isDragging) {
        this.isDragging = false;
        if (this.draggedPointIndex !== null) {
          const point = this.points[this.draggedPointIndex];
          point.oldX = point.x;
          point.oldY = point.y;
        }
        this.draggedPointIndex = null;
        this.rings.forEach(ring => {
          ring.style.cursor = this.isFollowMode ? 'none' : 'grab';
        });
      }
    };

    document.addEventListener('mouseup', handlePointerUp);
    document.addEventListener('touchend', handlePointerUp);

    // Add this new method to handle pointer movement
    this.handlePointerMove = (x, y) => {
      this.mousePos = { x, y };
      
      if (this.isDragging && this.draggedPointIndex !== null) {
        this.points[this.draggedPointIndex].x = x;
        this.points[this.draggedPointIndex].y = y;
        this.points[this.draggedPointIndex].oldX = x;
        this.points[this.draggedPointIndex].oldY = y;
      }
    };

    this.rainbowToggle.addEventListener('change', (e) => {
      if (this.isAdvancedMode) {
        e.preventDefault();
        this.rainbowToggle.checked = false;
        return;
      }
      this.isRainbow = e.target.checked;
      this.rainbowColorsSection.classList.toggle('hidden', !this.isRainbow);
      this.updatePreview();
    });

    this.defaultRainbowToggle.addEventListener('change', (e) => {
      this.useDefaultRainbow = e.target.checked;
      const defaultColors = [
        '#ff0000', '#ff7f00', '#ffff00', 
        '#00ff00', '#8787ff', '#4b0082', 
        '#9400d3'
      ];
      
      this.rainbowInputs.forEach((input, i) => {
        input.disabled = this.useDefaultRainbow;
        if (this.useDefaultRainbow) {
          input.value = defaultColors[i];
          this.rainbowColors[i] = defaultColors[i];
        }
      });
      this.updatePreview();
    });

    this.rainbowInputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        if (!this.useDefaultRainbow) {  
          this.rainbowColors[index] = e.target.value;
          this.updatePreview();
        }
      });
    });

    [this.color1Input, this.color2Input, this.patternSelect].forEach(element => {
      element.addEventListener('change', () => this.updatePreview());
      if (element.type === 'color') {
        element.addEventListener('input', () => this.updatePreview());
      }
    });

    // Add advanced mode toggle handler
    this.advancedToggle.addEventListener('change', (e) => {
      this.isAdvancedMode = e.target.checked;
      this.advancedColorsContainer.classList.toggle('hidden', !this.isAdvancedMode);
      this.basicControls.classList.toggle('hidden', this.isAdvancedMode);
      
      if (this.isAdvancedMode) {
        this.rainbowToggle.checked = false;
        this.isRainbow = false;
        this.rainbowColorsSection.classList.add('hidden');
      }
      
      this.rainbowToggle.disabled = this.isAdvancedMode;
      this.updatePreview();
    });

    this.gravitySlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      this.gravity = value;
      this.gravityValue.textContent = value.toFixed(1);
    });

    this.resetButton.addEventListener('click', () => {
      this.reset();
    });

    this.spacingSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      this.ringSpacing = value;
      this.spacingValue.textContent = value.toFixed(1);
      
      // Update stick lengths immediately
      this.sticks.forEach(stick => {
        stick.length = value;
      });
    });
  }

  updatePoint(point, index) {
    if (!point) return;

    if (this.isDragging && index === this.draggedPointIndex) {
      return; // Don't apply physics to dragged point
    }

    if (index === 0 && this.isFollowMode) {
      point.x = this.mousePos.x;
      point.y = this.mousePos.y;
      point.oldX = point.x;
      point.oldY = point.y;
      return;
    }
    
    const vx = (point.x - point.oldX) * this.friction;
    const vy = (point.y - point.oldY) * this.friction;
    
    point.oldX = point.x;
    point.oldY = point.y;
    
    point.x += vx;
    point.y += vy;
    point.y += this.gravity;

    const size = 40;
    const halfSize = size / 2;

    if (point.y + halfSize > window.innerHeight) {
      point.y = window.innerHeight - halfSize;
      point.oldY = point.y + vy * this.bounce;
    }

    if (point.y - halfSize < 0) {
      point.y = halfSize;
      point.oldY = point.y + vy * this.bounce;
    }

    if (point.x - halfSize < 0) {
      point.x = halfSize;
      point.oldX = point.x + vx * this.bounce;
    }

    if (point.x + halfSize > window.innerWidth) {
      point.x = window.innerWidth - halfSize;
      point.oldX = point.x + vx * this.bounce;
    }
  }

  constrainStick(stick, index) {
    const dx = stick.p1.x - stick.p0.x;
    const dy = stick.p1.y - stick.p0.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const difference = stick.length - distance;
    const percent = difference / distance / 2;
    const offsetX = dx * percent;
    const offsetY = dy * percent;

    if (index === 0 && this.isFollowMode) {
      stick.p0.x = this.mousePos.x;
      stick.p0.y = this.mousePos.y;
      stick.p1.x += offsetX;
      stick.p1.y += offsetY;
    } else if (this.isDragging) {
      // If dragging, don't move the dragged point
      if (stick.p0 === this.points[this.draggedPointIndex]) {
        stick.p1.x += offsetX * 2;
        stick.p1.y += offsetY * 2;
      } else if (stick.p1 === this.points[this.draggedPointIndex]) {
        stick.p0.x -= offsetX * 2;
        stick.p0.y -= offsetY * 2;
      } else {
        stick.p0.x -= offsetX;
        stick.p0.y -= offsetY;
        stick.p1.x += offsetX;
        stick.p1.y += offsetY;
      }
    } else {
      stick.p0.x -= offsetX;
      stick.p0.y -= offsetY;
      stick.p1.x += offsetX;
      stick.p1.y += offsetY;
    }
  }

  initPreview() {
    this.previewContainer.innerHTML = '';
    this.previewRings = [];
    
    for (let i = 0; i < this.numRings; i++) {
      const ring = document.createElement('div');
      ring.className = 'preview-ring';
      this.previewContainer.appendChild(ring);
      this.previewRings.push(ring);
    }
    this.updatePreview();
  }

  updatePreview() {
    const previewWidth = this.previewContainer.offsetWidth;
    const ringSize = 20;
    const spacing = 10;
    const startX = (previewWidth - ((this.numRings - 1) * spacing)) / 2;
    
    this.previewRings.forEach((ring, i) => {
      ring.style.left = `${startX + (i * spacing)}px`;
      ring.style.width = `${ringSize}px`;
      ring.style.height = `${ringSize}px`;
      ring.style.borderColor = this.getRingColor(i);
    });
  }

  getRingColor(index) {
    if (this.isAdvancedMode) {
      return this.individualColors[index];
    } else if (this.isRainbow) {
      const segment = (this.numRings - 1) / (this.rainbowColors.length - 1);
      const segmentIndex = Math.min(Math.floor(index / segment), this.rainbowColors.length - 2);
      const progress = (index % segment) / segment;
      
      return this.interpolateColors(
        this.rainbowColors[segmentIndex],
        this.rainbowColors[segmentIndex + 1],
        progress
      );
    } else if (this.pattern === 'alternating') {
      return index % 2 === 0 ? this.color1 : this.color2;
    } else {
      // Gradient pattern
      const progress = index / (this.numRings - 1);
      return this.interpolateColors(this.color1, this.color2, progress);
    }
  }

  interpolateColors(color1, color2, progress) {
    const hex1 = color1.match(/[A-Za-z0-9]{2}/g).map(v => parseInt(v, 16));
    const hex2 = color2.match(/[A-Za-z0-9]{2}/g).map(v => parseInt(v, 16));
    
    const r = Math.round(hex1[0] + (hex2[0] - hex1[0]) * progress);
    const g = Math.round(hex1[1] + (hex2[1] - hex1[1]) * progress);
    const b = Math.round(hex1[2] + (hex2[2] - hex1[2]) * progress);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  reset() {
    // Reset to initial state
    this.isDragging = false;
    this.draggedPointIndex = null;
    this.isFollowMode = true;
    this.modeToggleBtn.textContent = 'Drag Mode';
    this.modeToggleBtn.classList.remove('drag-mode');
    this.container.style.cursor = 'none';
    
    // Reset ring spacing
    this.ringSpacing = this.initialRingSpacing;
    this.spacingSlider.value = this.initialRingSpacing;
    this.spacingValue.textContent = this.initialRingSpacing.toFixed(1);
    
    // Reinitialize rings and points
    this.init();
    
    // Reset gravity
    this.gravity = 1.0;
    this.gravitySlider.value = 1.0;
    this.gravityValue.textContent = "1.0";
    
    // Update cursor styles
    this.rings.forEach(ring => {
      ring.style.cursor = 'none';
    });
  }

  animate() {
    this.points.forEach((point, i) => {
      if (i === 0 && this.isFollowMode) {
        point.x = this.mousePos.x;
        point.y = this.mousePos.y;
      } else {
        this.updatePoint(point, i);
      }
    });

    for (let i = 0; i < 8; i++) {
      this.sticks.forEach((stick, index) => this.constrainStick(stick, index));
    }

    this.points.forEach((point, i) => {
      const ring = this.rings[i];
      const size = 40;
      
      ring.style.left = `${point.x - size/2}px`;
      ring.style.top = `${point.y - size/2}px`;
      ring.style.width = `${size}px`;
      ring.style.height = `${size}px`;
      ring.style.borderColor = this.getRingColor(i);
      ring.style.zIndex = this.numRings - i;
    });

    requestAnimationFrame(() => this.animate());
  }
}

new Slinky();