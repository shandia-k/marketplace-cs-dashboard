/**
 * js/onboarding.js
 * Modular Onboarding Engine for CS Marketplace Dashboard (v1.0.9)
 * 
 * Features:
 * 1. Welcome Modal with v1.0.9 Production Readiness Changelog & System Overview
 * 2. Step-by-Step Interactive Guided Tour (Spotlight Highlight)
 * 3. Interactive Checklist Setup Tasks with Real-Time Action Triggers
 * 4. Extensible Versioned Architecture for Seamless Future Feature Onboarding
 * 5. On-Demand Replay & Secret Reset Support
 */

// ── ONBOARDING CONFIGURATION (MODULAR REGISTRY) ──────────────────────────────
const ONBOARDING_CONFIG = {
  get version() {
    if (typeof window !== 'undefined' && window.VERSIONS_REGISTRY && typeof window.VERSIONS_REGISTRY.getLatestVersion === 'function') {
      const latest = window.VERSIONS_REGISTRY.getLatestVersion();
      return latest ? latest.version : '1.0.9';
    }
    return '1.0.9';
  },
  welcomeTitle: 'Selamat Datang di CS Marketplace Dashboard',
  welcomeSubtitle: 'Pusat komando Customer Service Multi-Marketplace dalam 1 jendela kerja terpadu.',

  get currentVersionObj() {
    if (typeof window !== 'undefined' && window.VERSIONS_REGISTRY && typeof window.VERSIONS_REGISTRY.getLatestVersion === 'function') {
      return window.VERSIONS_REGISTRY.getLatestVersion();
    }
    return null;
  },

  // Informational Highlights (Mengambil dinamis dari versi rilis terbaru di VERSIONS_REGISTRY)
  get infoCards() {
    const ver = this.currentVersionObj;
    return ver && Array.isArray(ver.highlights) ? ver.highlights : [];
  },

  // Production Changelog Highlights (Mengambil dinamis dari versi rilis terbaru di VERSIONS_REGISTRY)
  get changelogCategories() {
    const ver = this.currentVersionObj;
    return ver && Array.isArray(ver.categories) ? ver.categories : [];
  },

  // Full Multi-Version History Registry (Mengambil dinamis dari js/versions-registry.js)
  get versions() {
    if (typeof window !== 'undefined' && window.VERSIONS_REGISTRY && typeof window.VERSIONS_REGISTRY.getAllVersions === 'function') {
      return window.VERSIONS_REGISTRY.getAllVersions();
    }
    return [];
  },

  // Fallback flat changelog array (for backward compatibility)
  get changelog() {
    const ver = this.currentVersionObj;
    if (ver && Array.isArray(ver.categories)) {
      return ver.categories.flatMap(c => c.items.map(item => `[${c.tag}] ${item}`));
    }
    return [];
  },

  // Step-by-Step Guided Tour Steps (5 Langkah Ringkas & Komprehensif)
  tourSteps: [
    {
      id: 'step_sidebar',
      target: '#sidebar',
      fallbackTarget: '#btn-add-store',
      title: 'Sidebar & Pengelompokan Toko',
      desc: 'Semua toko dikelompokkan rapi per marketplace. Anda bisa mencari toko, drag & drop urutan toko, dan menambahkan toko baru lewat tombol di bawah.',
      position: 'right'
    },
    {
      id: 'step_tab_bar',
      target: '#tab-bar',
      fallbackTarget: '.main-panel',
      title: 'Sistem Multi-Tab & Navigasi',
      desc: 'Buka banyak tab dalam 1 toko (Tab Chat, Tab Pesanan, Tab Produk). Dilengkapi tombol Back/Forward, tombol [+] Tab Baru, dan tombol tidur manual (🍃) untuk menghemat RAM.',
      position: 'bottom'
    },
    {
      id: 'step_status_bar',
      target: '#status-bar',
      fallbackTarget: '#titlebar',
      title: 'Live Status Bar & Pemantauan RAM',
      desc: 'Pantau penggunaan RAM (MB/GB) secara real-time, lama sesi kerja, jumlah tab aktif/tidur, dan klik cepat riwayat smart clipboard pada titlebar.',
      position: 'bottom'
    },
    {
      id: 'step_cs_toolkit',
      target: '#cs-toolkit-menu',
      fallbackTarget: '#btn-cs-toolkit-fab',
      title: 'Floating Tools CS & Speed Dial Menu',
      desc: 'Pusat produktivitas CS! Buka menu dial cepat ini untuk mengakses Smart Quick Reply (Ctrl+Space), Floating Scratchpad Multi-Tab (bisa simpan Word/Excel/TXT), dan Catatan Pembeli / Warning COD.',
      position: 'left'
    },
    {
      id: 'step_settings',
      target: '#sidebar-user-card',
      fallbackTarget: '#sidebar',
      title: 'Profil, Pengaturan & Bersihkan Cache Aman',
      desc: 'Klik kartu profil pengguna Anda di bawah sidebar untuk mengakses Pengaturan Akun, ganti PIN, backup konfigurasi, dan membersihkan file cache/temp dengan aman.',
      position: 'top'
    }
  ],

  // Interactive Step-by-Step Task Guides (Tutorial Step-by-Step Tiap Checklist)
  taskGuides: {
    task_add_store: [
      {
        id: 'guide_add_store_btn',
        target: '#btn-add-store',
        fallbackTarget: '#sidebar',
        title: '1. Klik Tombol + Tambah Toko',
        desc: 'Klik langsung tombol "+ Tambah Toko" di bagian bawah sidebar untuk membuka formulir pendaftaran toko.',
        position: 'top',
        bindEvents: (manager) => {
          if (typeof closeModal === 'function') closeModal();
          const btn = document.getElementById('btn-add-store');
          const btnEmpty = document.getElementById('btn-add-store-empty');
          const onClick = () => {
            setTimeout(() => manager.goToStep(1), 120);
          };
          btn?.addEventListener('click', onClick, { once: true });
          btnEmpty?.addEventListener('click', onClick, { once: true });
          return () => {
            btn?.removeEventListener('click', onClick);
            btnEmpty?.removeEventListener('click', onClick);
          };
        }
      },
      {
        id: 'guide_select_marketplace',
        target: '#marketplace-picker',
        fallbackTarget: '#modal-store',
        title: '2. Pilih Template Marketplace',
        desc: 'Klik salah satu template marketplace toko Anda (Shopee, Tokopedia, Lazada, TikTok Shop, dll). URL login portal chat seller resmi akan terkonfigurasi otomatis.',
        position: 'right',
        bindEvents: (manager) => {
          const overlay = document.getElementById('modal-overlay');
          if (!overlay || !overlay.classList.contains('active')) {
            if (typeof openAddModal === 'function') openAddModal();
          }
          const options = document.querySelectorAll('.mp-option');
          const onSelect = () => {
            setTimeout(() => manager.goToStep(2), 120);
          };
          options.forEach(opt => opt.addEventListener('click', onSelect, { once: true }));
          return () => {
            options.forEach(opt => opt.removeEventListener('click', onSelect));
          };
        }
      },
      {
        id: 'guide_store_name_initials',
        target: '#modal-store .form-row',
        fallbackTarget: '#store-name',
        title: '3. Ketik Nama & Inisial Toko',
        desc: 'Ketik nama toko Anda dan 2 huruf inisial singkat (misal "S1") pada kolom yang disorot. Tekan Enter atau pilih warna setelah selesai.',
        position: 'right',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke Warna →',
        bindEvents: (manager) => {
          const nameInput = document.getElementById('store-name');
          const initialsInput = document.getElementById('store-initials');
          if (nameInput) {
            setTimeout(() => nameInput.focus(), 80);
          }

          let advanced = false;
          const tryAdvance = () => {
            if (advanced) return;
            const nameVal = nameInput?.value.trim() || '';
            if (nameVal.length >= 2) {
              advanced = true;
              setTimeout(() => manager.goToStep(3), 120);
            }
          };

          const onKeyDown = (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              tryAdvance();
            }
          };

          nameInput?.addEventListener('keydown', onKeyDown);
          initialsInput?.addEventListener('keydown', onKeyDown);

          const presets = document.querySelectorAll('.color-preset');
          const onPresetClick = () => {
            tryAdvance();
          };
          presets.forEach(p => p.addEventListener('click', onPresetClick, { once: true }));

          return () => {
            nameInput?.removeEventListener('keydown', onKeyDown);
            initialsInput?.removeEventListener('keydown', onKeyDown);
            presets.forEach(p => p.removeEventListener('click', onPresetClick));
          };
        }
      },
      {
        id: 'guide_store_color',
        target: '#color-picker-wrapper',
        fallbackTarget: '#modal-store',
        title: '4. Pilih Warna Aksen Tab',
        desc: 'Klik salah satu lingkaran warna tema untuk membedakan tab toko ini dari toko lainnya.',
        position: 'right',
        bindEvents: (manager) => {
          const presets = document.querySelectorAll('.color-preset');
          const colorInput = document.getElementById('store-color');
          const onSelect = () => {
            setTimeout(() => manager.goToStep(4), 120);
          };
          presets.forEach(p => p.addEventListener('click', onSelect, { once: true }));
          colorInput?.addEventListener('change', onSelect, { once: true });
          return () => {
            presets.forEach(p => p.removeEventListener('click', onSelect));
            colorInput?.removeEventListener('change', onSelect);
          };
        }
      },
      {
        id: 'guide_store_save',
        target: '#btn-modal-save',
        fallbackTarget: '#modal-store',
        title: '5. Klik Simpan & Buat Toko',
        desc: 'Klik langsung tombol "Simpan Toko" di bawah untuk menyelesaikan. Toko baru Anda akan langsung dibuat dan aktif di sidebar! 🎉',
        position: 'top',
        bindEvents: (manager) => {
          const cancelBtn = document.getElementById('btn-modal-cancel');
          const closeBtn = document.getElementById('modal-close');
          const onCancel = () => {
            manager.endTour();
          };
          cancelBtn?.addEventListener('click', onCancel, { once: true });
          closeBtn?.addEventListener('click', onCancel, { once: true });
          return () => {
            cancelBtn?.removeEventListener('click', onCancel);
            closeBtn?.removeEventListener('click', onCancel);
          };
        }
      }
    ],

    task_open_tab: [
      {
        id: 'guide_select_store',
        target: '#sidebar-content .store-item, #sidebar .store-item',
        fallbackTarget: '#sidebar',
        title: '1. Pilih Toko di Sidebar',
        desc: 'Klik salah satu toko Anda di sidebar untuk membuka ruang kerja toko dan memuat bar multi-tab.',
        position: 'right',
        bindEvents: (manager) => {
          const sidebar = document.getElementById('sidebar-content') || document.getElementById('sidebar');
          const onSelectStore = (e) => {
            const item = e.target.closest('.store-item');
            if (item) {
              setTimeout(() => {
                if (manager.isTourActive && manager.currentGuideTaskId === 'task_open_tab') {
                  manager.goToStep(1);
                }
              }, 250);
            }
          };
          sidebar?.addEventListener('click', onSelectStore);
          return () => {
            sidebar?.removeEventListener('click', onSelectStore);
          };
        }
      },
      {
        id: 'guide_click_add_tab_btn',
        target: '#btn-add-tab, .tab-add-btn',
        fallbackTarget: '#tab-bar',
        title: '2. Klik Tombol [+] Tab Baru',
        desc: 'Klik langsung tombol [+] pada bar tab di atas untuk membuka tab baru pada toko ini.',
        position: 'bottom',
        bindEvents: (manager) => {
          const onAddTab = (e) => {
            if (e.target.closest('#btn-add-tab') || e.target.closest('.tab-add-btn')) {
              setTimeout(() => {
                if (manager.isTourActive && manager.currentGuideTaskId === 'task_open_tab') {
                  manager.goToStep(2);
                }
              }, 250);
            }
          };
          document.addEventListener('click', onAddTab);
          return () => {
            document.removeEventListener('click', onAddTab);
          };
        }
      },
      {
        id: 'guide_ctrl_click_feature',
        target: '#tab-bar',
        fallbackTarget: '.main-panel',
        title: '3. Fitur Multi-Tab & Ctrl+Klik Tautan',
        desc: 'Tab baru berhasil dibuka! 🎉<br><br>💡 <b>Tips Pro Multi-Tasking CS:</b><br>Tahan tombol <kbd style="background:var(--bg-tertiary);padding:2px 6px;border-radius:4px;border:1px solid var(--border-color);font-size:11px;font-family:monospace;">Ctrl</kbd> pada keyboard lalu <b>klik tautan apa saja</b> di dalam halaman toko (misal nomor pesanan, produk, atau menu) untuk membukanya langsung di tab baru tanpa meninggalkan halaman ini.',
        position: 'bottom',
        allowNextButton: true,
        nextButtonLabel: 'Selesai ✓',
        bindEvents: (manager) => {
          const activeWv = document.querySelector('webview.active, .webview-wrapper.active webview, webview');
          if (activeWv && typeof activeWv.executeJavaScript === 'function') {
            activeWv.executeJavaScript(`(() => {
              const links = Array.from(document.querySelectorAll('a[href]'))
                .filter(a => {
                  if (!a.href || a.href.startsWith('javascript:') || a.href === '#') return false;
                  const rect = a.getBoundingClientRect();
                  const isVisible = rect.width > 0 && rect.height > 0 && 
                                    rect.top >= 0 && rect.bottom <= window.innerHeight &&
                                    rect.left >= 0 && rect.right <= window.innerWidth;
                  const text = (a.innerText || '').trim();
                  return isVisible && text.length >= 2 && text.length <= 35;
                });
              if (links.length > 0) {
                const sampleLink = links[0];
                sampleLink.style.outline = '2px dashed #df1683';
                sampleLink.style.outlineOffset = '3px';
                sampleLink.style.borderRadius = '4px';
                sampleLink.style.boxShadow = '0 0 12px rgba(223, 22, 131, 0.4)';
                return sampleLink.innerText.trim().substring(0, 25);
              }
              return null;
            })()`).then(linkText => {
              if (linkText) {
                const descEl = document.getElementById('onboarding-tour-desc');
                if (descEl) {
                  descEl.innerHTML = `Tab baru berhasil dibuka! 🎉<br><br>💡 <b>Tips Pro Multi-Tasking CS:</b><br>Tahan tombol <kbd style="background:var(--bg-tertiary);padding:2px 6px;border-radius:4px;border:1px solid var(--border-color);font-size:11px;font-family:monospace;">Ctrl</kbd> lalu <b>klik tautan apa saja</b> (contoh tautan <i>"${linkText}"</i>) untuk membukanya langsung di tab baru tanpa meninggalkan halaman ini.`;
                }
              }
            }).catch(() => {});
          }

          // Otomatis selesai jika user mencoba Ctrl+Klik link atau klik tab lain
          const onNextTab = () => {
            setTimeout(() => manager.endTour(), 250);
          };
          window.addEventListener('tab-created', onNextTab, { once: true });

          return () => {
            window.removeEventListener('tab-created', onNextTab);
            if (activeWv && typeof activeWv.executeJavaScript === 'function') {
              activeWv.executeJavaScript(`(() => {
                document.querySelectorAll('a[href]').forEach(a => {
                  if (a.style.outline && a.style.outline.includes('dashed')) {
                    a.style.outline = '';
                    a.style.outlineOffset = '';
                    a.style.borderRadius = '';
                    a.style.boxShadow = '';
                  }
                });
              })()`).catch(() => {});
            }
          };
        }
      }
    ],

    task_quick_reply: [
      // ── TAHAP 1: MEMBUAT & MENYIMPAN TEMPLATE BARU ──
      {
        id: 'qr_step_open_fab',
        target: '#btn-cs-toolkit-fab',
        fallbackTarget: '#cs-toolkit-fab-container',
        title: '1. Buka Menu Tools CS',
        desc: 'Klik tombol floating "Tools CS" di pojok kanan bawah untuk membuka menu alat produktivitas CS.',
        position: 'left',
        bindEvents: (manager) => {
          if (typeof window.closeToolkitMenu === 'function') window.closeToolkitMenu();
          if (typeof closeQuickReplyDrawer === 'function') closeQuickReplyDrawer();
          if (typeof closeTemplateModal === 'function') closeTemplateModal(false);
          const fab = document.getElementById('btn-cs-toolkit-fab');
          const onFabClick = () => {
            setTimeout(() => manager.goToStep(1), 200);
          };
          fab?.addEventListener('click', onFabClick, { once: true });
          return () => fab?.removeEventListener('click', onFabClick);
        }
      },
      {
        id: 'qr_step_click_dial',
        target: '#tool-item-quickreply',
        fallbackTarget: '#cs-toolkit-menu',
        title: '2. Pilih Smart Quick Reply',
        desc: 'Klik menu "Smart Quick Reply" pada menu dial untuk membuka drawer template balasan cepat.',
        position: 'left',
        bindEvents: (manager) => {
          const item = document.getElementById('tool-item-quickreply');
          const onItemClick = () => {
            setTimeout(() => manager.goToStep(2), 250);
          };
          item?.addEventListener('click', onItemClick, { once: true });
          return () => item?.removeEventListener('click', onItemClick);
        }
      },
      {
        id: 'qr_step_click_add_tpl',
        target: '#btn-qr-add-template',
        fallbackTarget: '#quickreply-drawer',
        title: '3. Klik Tambah Template',
        desc: 'Klik tombol "+ Tambah Template" di bagian bawah drawer untuk membuka formulir pembuatan template baru.',
        position: 'top',
        bindEvents: (manager) => {
          const btnAdd = document.getElementById('btn-qr-add-template');
          const onAddClick = () => {
            setTimeout(() => manager.goToStep(3), 200);
          };
          btnAdd?.addEventListener('click', onAddClick, { once: true });
          return () => btnAdd?.removeEventListener('click', onAddClick);
        }
      },
      {
        id: 'qr_step_fill_title',
        target: '#modal-template-overlay .form-group:nth-child(1)',
        fallbackTarget: '#tpl-name-input',
        title: '4. Ketik Judul Template',
        desc: 'Ketik judul template Anda pada kolom yang disorot (misal: <i>"Konfirmasi Resi CS"</i>). Tekan Enter atau pilih kategori setelah selesai.',
        position: 'right',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke Kategori →',
        bindEvents: (manager) => {
          const input = document.getElementById('tpl-name-input');
          if (input) {
            if (!input.value.trim()) {
              input.value = 'Konfirmasi Resi CS';
            }
            setTimeout(() => {
              input.focus();
              input.select();
            }, 100);
          }
          let advanced = false;
          const tryAdvance = () => {
            if (advanced) return;
            advanced = true;
            setTimeout(() => manager.goToStep(4), 150);
          };
          const onKeyDown = (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              tryAdvance();
            }
          };
          input?.addEventListener('keydown', onKeyDown);
          const catSelect = document.getElementById('tpl-cat-select');
          catSelect?.addEventListener('focus', tryAdvance, { once: true });
          return () => {
            input?.removeEventListener('keydown', onKeyDown);
            catSelect?.removeEventListener('focus', tryAdvance);
          };
        }
      },
      {
        id: 'qr_step_choose_category',
        target: '#modal-template-overlay .form-group:nth-child(2)',
        fallbackTarget: '#tpl-cat-select',
        title: '5. Pilih Kategori Template',
        desc: 'Pilih kategori yang sesuai untuk template ini (misal: "Pesanan & Resi").',
        position: 'right',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke Variabel →',
        bindEvents: (manager) => {
          const catSelect = document.getElementById('tpl-cat-select');
          if (catSelect) catSelect.value = 'order';
          const onCatChange = () => {
            setTimeout(() => manager.goToStep(5), 200);
          };
          catSelect?.addEventListener('change', onCatChange, { once: true });
          const pills = document.querySelectorAll('.var-pill-btn');
          pills.forEach(p => p.addEventListener('click', onCatChange, { once: true }));
          return () => {
            catSelect?.removeEventListener('change', onCatChange);
            pills.forEach(p => p.removeEventListener('click', onCatChange));
          };
        }
      },
      {
        id: 'qr_step_insert_variables',
        target: '#modal-template-overlay .qr-var-helper-bar',
        fallbackTarget: '#tpl-content-input',
        title: '6. Sisipkan Variabel Dinamis',
        desc: 'Perhatikan kalimat yang diketik otomatis di bawah. 👉 <b>Klik tombol variabel <mark style="background:#df1683;color:#fff;padding:2px 6px;border-radius:4px;font-weight:700;">{waktu}</mark></b> untuk menyisipkannya.',
        position: 'top',
        bindEvents: (manager) => {
          const textarea = document.getElementById('tpl-content-input');
          const pills = document.querySelectorAll('.var-pill-btn');
          const pillWaktu = document.querySelector('.var-pill-btn[data-var="{waktu}"]');
          const pillToko = document.querySelector('.var-pill-btn[data-var="{toko}"]');
          const pillClip = document.querySelector('.var-pill-btn[data-var="{clipboard}"]');
          const descEl = document.getElementById('onboarding-tour-desc');

          if (textarea) textarea.value = '';

          let streamTimer = null;
          let currentPhase = 1; // 1: waktu, 2: toko, 3: clipboard, 4: done

          const typeText = (targetText, onComplete) => {
            if (!textarea) return null;
            let i = 0;
            const interval = setInterval(() => {
              if (i < targetText.length) {
                textarea.value += targetText.charAt(i);
                textarea.scrollTop = textarea.scrollHeight;
                i++;
              } else {
                clearInterval(interval);
                if (typeof onComplete === 'function') onComplete();
              }
            }, 25);
            return interval;
          };

          const highlightPill = (targetPill) => {
            pills.forEach(p => {
              p.style.outline = '';
              p.style.boxShadow = '';
              p.style.transform = '';
            });
            if (targetPill) {
              targetPill.style.outline = '2px solid #df1683';
              targetPill.style.boxShadow = '0 0 12px rgba(223, 22, 131, 0.7)';
              targetPill.style.transform = 'scale(1.08)';
              targetPill.focus();
            }
          };

          // Phase 1: Ketik "Halo " -> minta user klik {waktu}
          streamTimer = typeText('Halo ', () => {
            highlightPill(pillWaktu);
            if (descEl) {
              descEl.innerHTML = 'Kalimat pembuka diketik... 👉 <b>Klik tombol variabel <mark style="background:#df1683;color:#fff;padding:2px 6px;border-radius:4px;font-weight:700;">{waktu}</mark></b> di atas.';
            }
          });

          const onWaktuClick = () => {
            if (currentPhase !== 1) return;
            currentPhase = 2;
            if (descEl) {
              descEl.innerHTML = 'Bagus! Melanjutkan kalimat... 👉 <b>Klik tombol variabel <mark style="background:#df1683;color:#fff;padding:2px 6px;border-radius:4px;font-weight:700;">{toko}</mark></b>.';
            }
            highlightPill(null);
            setTimeout(() => {
              streamTimer = typeText(', pesanan Anda di ', () => {
                highlightPill(pillToko);
              });
            }, 100);
          };

          const onTokoClick = () => {
            if (currentPhase !== 2) return;
            currentPhase = 3;
            if (descEl) {
              descEl.innerHTML = 'Keren! Melanjutkan kalimat... 👉 <b>Klik tombol variabel <mark style="background:#df1683;color:#fff;padding:2px 6px;border-radius:4px;font-weight:700;">{clipboard}</mark></b>.';
            }
            highlightPill(null);
            setTimeout(() => {
              streamTimer = typeText(' dengan nomor resi ', () => {
                highlightPill(pillClip);
              });
            }, 100);
          };

          const onClipClick = () => {
            if (currentPhase !== 3) return;
            currentPhase = 4;
            highlightPill(null);
            if (descEl) {
              descEl.innerHTML = 'Menyelesaikan kalimat template...';
            }
            setTimeout(() => {
              streamTimer = typeText(' sudah kami proses ya kak!', () => {
                if (descEl) {
                  descEl.innerHTML = '🎉 <b>Sempurna!</b> Semua variabel dinamis telah tersusun rapi. Melanjutkan ke langkah simpan...';
                }
                setTimeout(() => {
                  manager.goToStep(6); // Maju ke Langkah 7 (Simpan)
                }, 700);
              });
            }, 100);
          };

          pillWaktu?.addEventListener('click', onWaktuClick);
          pillToko?.addEventListener('click', onTokoClick);
          pillClip?.addEventListener('click', onClipClick);

          return () => {
            if (streamTimer) clearInterval(streamTimer);
            highlightPill(null);
            pillWaktu?.removeEventListener('click', onWaktuClick);
            pillToko?.removeEventListener('click', onTokoClick);
            pillClip?.removeEventListener('click', onClipClick);
          };
        }
      },
      {
        id: 'qr_step_save_template',
        target: '#btn-tpl-modal-save',
        fallbackTarget: '#modal-template-overlay .modal-footer',
        title: '7. Simpan Template Baru',
        desc: 'Formulir template Anda telah terisi lengkap dan valid! Klik tombol <b>"Simpan Template"</b> di bawah untuk menyimpannya.',
        position: 'top',
        bindEvents: (manager) => {
          const textarea = document.getElementById('tpl-content-input');
          if (textarea && !textarea.value.trim()) {
            textarea.value = 'Halo {waktu}, pesanan Anda di {toko} dengan nomor resi {clipboard} sudah kami proses ya kak!';
          }
          const btnSave = document.getElementById('btn-tpl-modal-save');
          const onSaveClick = () => {
            setTimeout(() => manager.goToStep(7), 300);
          };
          btnSave?.addEventListener('click', onSaveClick, { once: true });
          return () => btnSave?.removeEventListener('click', onSaveClick);
        }
      },
      {
        id: 'qr_step_card_actions',
        target: '#qr-templates-list .qr-template-card:first-child .qr-card-actions',
        fallbackTarget: '#qr-templates-list .qr-template-card:first-child',
        title: '8. Tombol Aksi: Sisipkan, Salin, Edit & Hapus',
        desc: 'Setiap kartu template dilengkapi 4 tombol kendali produktivitas CS:<br>• ⚡ <b>Sisipkan ke Chat</b>: Mengetikkan kalimat template langsung ke chat pembeli toko aktif.<br>• 📋 <b>Salin</b>: Menyalin teks (dengan variabel terisi otomatis) ke clipboard.<br>• ✏️ <b>Edit</b>: Mengubah judul, kategori, atau isi template.<br>• 🗑️ <b>Hapus</b>: Menghapus template jika sudah tidak diperlukan.<br><br>👉 Klik tombol <b>"Lanjut ke Tutup Drawer →"</b> di bawah untuk melanjutkan.',
        position: 'top',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke Tutup Drawer →',
        bindEvents: (manager) => {
          const card = document.querySelector('#qr-templates-list .qr-template-card:first-child');
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          const onNextStep = () => {
            setTimeout(() => manager.goToStep(8), 200);
          };
          const btnInsert = card?.querySelector('.qr-btn-insert');
          const btnCopy = card?.querySelector('.qr-btn-action');
          const btnEdit = card?.querySelector('.qr-btn-action-icon[title="Edit Template"]');
          btnInsert?.addEventListener('click', onNextStep, { once: true });
          btnCopy?.addEventListener('click', onNextStep, { once: true });
          btnEdit?.addEventListener('click', onNextStep, { once: true });
          return () => {
            btnInsert?.removeEventListener('click', onNextStep);
            btnCopy?.removeEventListener('click', onNextStep);
            btnEdit?.removeEventListener('click', onNextStep);
          };
        }
      },
      {
        id: 'qr_step_close_drawer',
        target: '#qr-drawer-close',
        fallbackTarget: '#quickreply-drawer',
        title: '9. Tutup Drawer Quick Reply',
        desc: 'Template baru Anda telah siap digunakan! 🎉 Klik tombol <b>[X]</b> di atas untuk menutup drawer dan beralih ke <b>Tahap 2: Uji Coba Pintasan Ctrl+Space</b>.',
        position: 'left',
        bindEvents: (manager) => {
          const btnClose = document.getElementById('qr-drawer-close');
          const backdrop = document.getElementById('quickreply-backdrop');
          const onClose = () => {
            setTimeout(() => manager.goToStep(9), 250);
          };
          btnClose?.addEventListener('click', onClose, { once: true });
          backdrop?.addEventListener('click', onClose, { once: true });
          return () => {
            btnClose?.removeEventListener('click', onClose);
            backdrop?.removeEventListener('click', onClose);
          };
        }
      },

      // ── TAHAP 2: UJI COBA SHORTCUT CTRL+SPACE DI SANDBOX CHATBOX ──
      {
        id: 'qr_step_practice_ctrl_space',
        target: '#onboarding-sandbox-input',
        fallbackTarget: '#onboarding-qr-sandbox',
        title: '10. Tahap 2: Uji Coba Pintasan Ctrl + Space',
        desc: 'Sistem telah otomatis menyiapkan contoh nomor resi <code>SPXID04829104829</code> ke clipboard.<br><br>👉 <b>Klik kolom pesan di bawah</b>, lalu tekan tombol <kbd style="background:var(--bg-tertiary);padding:2px 6px;border-radius:4px;border:1px solid var(--border-color);font-size:11px;">Ctrl</kbd> + <kbd style="background:var(--bg-tertiary);padding:2px 6px;border-radius:4px;border:1px solid var(--border-color);font-size:11px;">Space</kbd>!',
        position: 'top',
        bindEvents: (manager) => {
          // Siapkan sample clipboard
          if (typeof setCapturedClipboard === 'function') {
            setCapturedClipboard('SPXID04829104829', '📦 Contoh Nomor Resi');
          }
          // Injeksi atau tampilkan sandbox chatbox
          manager.renderQuickReplySandbox();

          const sandboxInput = document.getElementById('onboarding-sandbox-input');
          if (sandboxInput) {
            sandboxInput.value = '';
            setTimeout(() => sandboxInput.focus(), 150);
          }

          const onKeyDown = (e) => {
            if ((e.ctrlKey && e.code === 'Space') || (e.altKey && (e.key === 'q' || e.key === 'Q'))) {
              e.preventDefault();
              e.stopPropagation();
              manager.showSandboxDropdown();
              setTimeout(() => manager.goToStep(10), 200);
            }
          };

          sandboxInput?.addEventListener('keydown', onKeyDown);
          window.addEventListener('keydown', onKeyDown);

          return () => {
            sandboxInput?.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keydown', onKeyDown);
          };
        }
      },
      {
        id: 'qr_step_select_and_send',
        target: '#onboarding-sandbox-dropdown',
        fallbackTarget: '#onboarding-qr-sandbox',
        title: '11. Cari & Pilih Template Smart Reply 🎉',
        desc: 'Ketik kata kunci pencarian (misal: <i>"resi"</i> atau <i>"sapaan"</i>) pada kolom chat untuk menyaring template, lalu klik salah satu template di bawah untuk mengirimkannya!',
        position: 'top',
        allowNextButton: true,
        nextButtonLabel: 'Selesai ✓',
        bindEvents: (manager) => {
          manager.showSandboxDropdown();
          const sandboxInput = document.getElementById('onboarding-sandbox-input');
          
          const onSearchInput = (e) => {
            manager.showSandboxDropdown(e.target.value);
          };

          sandboxInput?.addEventListener('input', onSearchInput);
          if (sandboxInput) sandboxInput.focus();

          const onSelectTemplate = (resolvedText) => {
            if (sandboxInput) {
              sandboxInput.value = resolvedText;
              sandboxInput.style.borderColor = '#10b981';
              sandboxInput.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.3)';
            }
            if (typeof notifyAction === 'function' || (window.OnboardingManager && typeof window.OnboardingManager.notifyAction === 'function')) {
              window.OnboardingManager.notifyAction('use_quickreply');
            }
            setTimeout(() => {
              manager.removeQuickReplySandbox();
              manager.endTour();
            }, 1200);
          };

          manager.sandboxTemplateSelectHandler = onSelectTemplate;

          return () => {
            sandboxInput?.removeEventListener('input', onSearchInput);
            manager.sandboxTemplateSelectHandler = null;
            manager.removeQuickReplySandbox();
          };
        }
      }
    ],

    task_customer_notes: [
      {
        id: 'cnote_step_open_fab',
        target: '#btn-cs-toolkit-fab',
        fallbackTarget: '#cs-toolkit-menu',
        title: '1. Buka Menu Tools CS',
        desc: 'Klik tombol floating <b>Tools CS (⚡)</b> di pojok kanan bawah layar untuk membuka menu speed dial produktivitas.',
        position: 'left',
        bindEvents: (manager) => {
          const menu = document.getElementById('cs-toolkit-menu');
          if (menu && menu.classList.contains('active')) {
            setTimeout(() => manager.goToStep(1), 100);
            return;
          }
          const fab = document.getElementById('btn-cs-toolkit-fab');
          const onClick = () => {
            setTimeout(() => manager.goToStep(1), 150);
          };
          fab?.addEventListener('click', onClick, { once: true });
          return () => fab?.removeEventListener('click', onClick);
        }
      },
      {
        id: 'cnote_step_click_dial',
        target: '#tool-item-cnotes',
        fallbackTarget: '#cs-toolkit-menu',
        title: '2. Pilih Catatan Pembeli & Warning COD',
        desc: 'Klik menu <b>"Catatan Pembeli" (📝)</b> untuk membuka database catatan pelanggan dan pemantau risiko retur COD.',
        position: 'left',
        bindEvents: (manager) => {
          if (typeof window.toggleToolkitMenu === 'function') {
            window.toggleToolkitMenu(true);
          }
          const item = document.getElementById('tool-item-cnotes');
          const onClick = () => {
            if (typeof openCustomerNotesModal === 'function') {
              openCustomerNotesModal();
            }
            setTimeout(() => manager.goToStep(2), 250);
          };
          item?.addEventListener('click', onClick, { once: true });
          return () => item?.removeEventListener('click', onClick);
        }
      },
      {
        id: 'cnote_step_filter_tabs',
        target: '.cnotes-filter-tabs',
        fallbackTarget: '#modal-cnotes-overlay .modal-body',
        title: '3. Filter Kategori & Status Pembeli',
        desc: 'Gunakan tab filter untuk mengelompokkan pembeli secara instan! Coba klik salah satu tab seperti <mark style="background:rgba(239,68,68,0.2);color:#ef4444;padding:2px 6px;border-radius:4px;font-weight:700;">⚠️ Perhatian / COD</mark> atau <mark style="background:rgba(245,158,11,0.2);color:#d97706;padding:2px 6px;border-radius:4px;font-weight:700;">🌟 VIP Buyer</mark>.',
        position: 'bottom',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke Cari →',
        bindEvents: (manager) => {
          const overlay = document.getElementById('modal-cnotes-overlay');
          if (!overlay || !overlay.classList.contains('active')) {
            if (typeof openCustomerNotesModal === 'function') openCustomerNotesModal();
          }
          const tabs = document.querySelectorAll('.btn-cnotes-tab');
          const onTabClick = () => {
            setTimeout(() => manager.goToStep(3), 180);
          };
          tabs.forEach(t => t.addEventListener('click', onTabClick, { once: true }));
          return () => tabs.forEach(t => t.removeEventListener('click', onTabClick));
        }
      },
      {
        id: 'cnote_step_search_buyer',
        target: '#cnotes-search-input',
        fallbackTarget: '#modal-cnotes-overlay .modal-body',
        title: '4. Cari Data Pembeli Cepat',
        desc: 'Ketik nama, username, nomor WhatsApp/HP, atau isi catatan pada kolom pencarian untuk menyaring data pembeli secara real-time.',
        position: 'bottom',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke Tambah →',
        bindEvents: (manager) => {
          const searchInput = document.getElementById('cnotes-search-input');
          if (searchInput) {
            setTimeout(() => searchInput.focus(), 100);
          }
          let advanced = false;
          const onInput = (e) => {
            if (!advanced && e.target.value.trim().length >= 2) {
              advanced = true;
              setTimeout(() => manager.goToStep(4), 500);
            }
          };
          searchInput?.addEventListener('input', onInput);
          return () => searchInput?.removeEventListener('input', onInput);
        }
      },
      {
        id: 'cnote_step_click_add',
        target: '#btn-cnotes-add',
        fallbackTarget: '#modal-cnotes-overlay .modal-body',
        title: '5. Tambah Catatan Pembeli Baru',
        desc: 'Klik tombol <b>"+ Tambah Catatan Baru"</b> untuk membuka formulir pendataan pelanggan atau memberi label warning.',
        position: 'left',
        bindEvents: (manager) => {
          const btnAdd = document.getElementById('btn-cnotes-add');
          const onAddClick = () => {
            setTimeout(() => manager.goToStep(5), 200);
          };
          btnAdd?.addEventListener('click', onAddClick, { once: true });
          return () => btnAdd?.removeEventListener('click', onAddClick);
        }
      },
      {
        id: 'cnote_step_input_buyer_name',
        target: '#form-cnote-buyer',
        fallbackTarget: '#modal-cnote-form-overlay .modal-body',
        title: '6. Masukkan Nama / Username Pembeli <span style="color:#ef4444;">*</span>',
        desc: 'Ketik nama atau username pembeli pada kolom wajib yang disorot (misal: <code>Hendra (hendra_jaya)</code>).',
        position: 'top',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke No HP & Label →',
        bindEvents: (manager) => {
          const formOverlay = document.getElementById('modal-cnote-form-overlay');
          if (!formOverlay || !formOverlay.classList.contains('active')) {
            if (typeof openAddNoteFormModal === 'function') openAddNoteFormModal();
          }
          const buyerInput = document.getElementById('form-cnote-buyer');
          if (buyerInput) {
            setTimeout(() => buyerInput.focus(), 100);
            if (!buyerInput.value.trim()) {
              buyerInput.value = 'Hendra (hendra_jaya)';
            }
          }
          let advanced = false;
          const onInput = () => {
            if (!advanced && buyerInput && buyerInput.value.trim().length >= 3) {
              advanced = true;
              setTimeout(() => manager.goToStep(6), 400);
            }
          };
          const onKeyDown = (e) => {
            if (e.key === 'Enter' || e.key === 'Tab') {
              if (buyerInput && buyerInput.value.trim()) {
                e.preventDefault();
                manager.goToStep(6);
              }
            }
          };
          buyerInput?.addEventListener('input', onInput);
          buyerInput?.addEventListener('keydown', onKeyDown);
          return () => {
            buyerInput?.removeEventListener('input', onInput);
            buyerInput?.removeEventListener('keydown', onKeyDown);
          };
        }
      },
      {
        id: 'cnote_step_phone_and_tag',
        target: '#modal-cnote-form-overlay .form-row',
        fallbackTarget: '#form-cnote-tag',
        title: '7. Nomor WhatsApp & Label Status',
        desc: 'Isi nomor WhatsApp dan tentukan label status pelanggan:<br>• 🌟 <b>VIP Buyer</b>: Pelanggan prioritas & langganan setia.<br>• ⚠️ <b>Perhatian (COD)</b>: Riwayat pernah tolak paket COD.<br>• 📦 <b>Riwayat Retur</b>: Catatan komplain atau retur barang.<br>• ℹ️ <b>Catatan Biasa</b>: Informasi umum pelanggan.',
        position: 'top',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke Isi Catatan →',
        bindEvents: (manager) => {
          const phoneInput = document.getElementById('form-cnote-phone');
          const tagSelect = document.getElementById('form-cnote-tag');
          if (phoneInput && !phoneInput.value.trim()) {
            phoneInput.value = '081298765432';
          }
          if (tagSelect) {
            tagSelect.value = 'vip';
          }
          const onTagChange = () => {
            setTimeout(() => manager.goToStep(7), 250);
          };
          tagSelect?.addEventListener('change', onTagChange, { once: true });
          return () => tagSelect?.removeEventListener('change', onTagChange);
        }
      },
      {
        id: 'cnote_step_input_note_text',
        target: '#form-cnote-text',
        fallbackTarget: '#modal-cnote-form-overlay .modal-body',
        title: '8. Tulis Detail Catatan Khusus <span style="color:#ef4444;">*</span>',
        desc: 'Tulis instruksi penanganan untuk CS (misal: <i>"Pelanggan setia partai besar, selalu berikan bonus stiker dan packing bubble tebal."</i>).',
        position: 'top',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke Simpan →',
        bindEvents: (manager) => {
          const noteText = document.getElementById('form-cnote-text');
          if (noteText) {
            setTimeout(() => noteText.focus(), 100);
            if (!noteText.value.trim()) {
              noteText.value = 'Pelanggan setia partai besar, selalu berikan bonus stiker dan packing bubble tebal.';
            }
          }
          const onKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              manager.goToStep(8);
            }
          };
          noteText?.addEventListener('keydown', onKeyDown);
          return () => noteText?.removeEventListener('keydown', onKeyDown);
        }
      },
      {
        id: 'cnote_step_save_note',
        target: '#btn-cnote-form-save',
        fallbackTarget: '#modal-cnote-form-overlay .modal-footer',
        title: '9. Simpan Catatan ke Database',
        desc: 'Formulir telah lengkap dan valid! Klik tombol <b>"Simpan Catatan"</b> untuk menyimpan data pembeli ke database lokal.',
        position: 'top',
        bindEvents: (manager) => {
          const buyerInput = document.getElementById('form-cnote-buyer');
          const noteText = document.getElementById('form-cnote-text');
          if (buyerInput && !buyerInput.value.trim()) buyerInput.value = 'Hendra (hendra_jaya)';
          if (noteText && !noteText.value.trim()) noteText.value = 'Pelanggan setia partai besar, selalu berikan bonus stiker dan packing bubble tebal.';
          
          const btnSave = document.getElementById('btn-cnote-form-save');
          const onSaveClick = () => {
            setTimeout(() => manager.goToStep(9), 300);
          };
          btnSave?.addEventListener('click', onSaveClick, { once: true });
          return () => btnSave?.removeEventListener('click', onSaveClick);
        }
      },
      {
        id: 'cnote_step_card_actions',
        target: '#cnotes-list .cnote-card:first-child .cnote-actions',
        fallbackTarget: '#cnotes-list .cnote-card:first-child',
        title: '10. Fitur Aksi Cepat Kartu Pembeli',
        desc: 'Setiap kartu pembeli dilengkapi tombol aksi canggih:<br>• ⚡ <b>Ketik Sapaan Khusus</b>: Mengetik kalimat sapaan otomatis yang dipersonalisasi sesuai nama & status pembeli langsung ke chat toko aktif!<br>• ✏️ <b>Edit Catatan</b>: Mengubah nomor HP, label status, atau isi catatan.<br>• 🗑️ <b>Hapus Catatan</b>: Menghapus data pelanggan jika sudah tidak diperlukan.<br><br>👉 Klik tombol <b>"Lanjut ke Tutup Modal →"</b> di bawah.',
        position: 'top',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke Tutup Modal →',
        bindEvents: (manager) => {
          const firstCard = document.querySelector('#cnotes-list .cnote-card:first-child');
          if (firstCard) {
            firstCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          const onNextStep = () => {
            setTimeout(() => manager.goToStep(10), 200);
          };
          const btnGreeting = firstCard?.querySelector('button[title*="Sapaan"]');
          const btnEdit = firstCard?.querySelector('button[title*="Edit"]');
          btnGreeting?.addEventListener('click', onNextStep, { once: true });
          btnEdit?.addEventListener('click', onNextStep, { once: true });
          return () => {
            btnGreeting?.removeEventListener('click', onNextStep);
            btnEdit?.removeEventListener('click', onNextStep);
          };
        }
      },
      {
        id: 'cnote_step_close_modal',
        target: '#btn-cnotes-close',
        fallbackTarget: '#modal-cnotes-overlay .modal-header',
        title: '11. Selesai! Tutup Catatan Pembeli 🎉',
        desc: 'Data pelanggan baru Anda telah tersimpan rapi! Klik tombol <b>[X]</b> di pojok kanan atas untuk menutup modal dan menyelesaikan panduan ini.',
        position: 'left',
        bindEvents: (manager) => {
          const btnClose = document.getElementById('btn-cnotes-close');
          const overlay = document.getElementById('modal-cnotes-overlay');
          const onClose = () => {
            if (typeof notifyAction === 'function' || (window.OnboardingManager && typeof window.OnboardingManager.notifyAction === 'function')) {
              window.OnboardingManager.notifyAction('use_cnotes');
            }
            setTimeout(() => manager.endTour(), 400);
          };
          btnClose?.addEventListener('click', onClose, { once: true });
          overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) onClose();
          }, { once: true });
          return () => {
            btnClose?.removeEventListener('click', onClose);
          };
        }
      }
    ],

    task_scratchpad: [
      {
        id: 'sp_step_open_fab',
        target: '#btn-cs-toolkit-fab',
        fallbackTarget: '#cs-toolkit-menu',
        title: '1. Buka Menu Tools CS',
        desc: 'Klik tombol floating <b>Tools CS (⚡)</b> di pojok kanan bawah layar untuk membuka menu speed dial produktivitas.',
        position: 'left',
        bindEvents: (manager) => {
          const menu = document.getElementById('cs-toolkit-menu');
          if (menu && menu.classList.contains('active')) {
            setTimeout(() => manager.goToStep(1), 100);
            return;
          }
          const fab = document.getElementById('btn-cs-toolkit-fab');
          const onClick = () => {
            setTimeout(() => manager.goToStep(1), 150);
          };
          fab?.addEventListener('click', onClick, { once: true });
          return () => fab?.removeEventListener('click', onClick);
        }
      },
      {
        id: 'sp_step_click_dial',
        target: '#tool-item-scratchpad',
        fallbackTarget: '#cs-toolkit-menu',
        title: '2. Buka Scratchpad Catatan',
        desc: 'Klik menu <b>"Scratchpad Catatan" (📝)</b> untuk memunculkan jendela floating catatan serbaguna CS.',
        position: 'left',
        bindEvents: (manager) => {
          if (typeof window.toggleToolkitMenu === 'function') {
            window.toggleToolkitMenu(true);
          }
          const item = document.getElementById('tool-item-scratchpad');
          const onClick = () => {
            if (typeof openScratchpad === 'function') {
              openScratchpad();
            }
            setTimeout(() => manager.goToStep(2), 250);
          };
          item?.addEventListener('click', onClick, { once: true });
          return () => item?.removeEventListener('click', onClick);
        }
      },
      {
        id: 'sp_step_type_content',
        target: '#scratchpad-textarea',
        fallbackTarget: '#scratchpad-window',
        title: '3. Tulis Catatan atau Draft Pesan',
        desc: 'Gunakan area teks ini untuk mencatat nomor rekening, draft pesan khusus pembeli, format order, atau menempelkan tabel data Excel/Word.',
        position: 'left',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke Multi-Tab →',
        bindEvents: (manager) => {
          const win = document.getElementById('scratchpad-window');
          if (!win || win.style.display === 'none') {
            if (typeof openScratchpad === 'function') openScratchpad();
          }
          const textarea = document.getElementById('scratchpad-textarea');
          if (textarea) {
            setTimeout(() => textarea.focus(), 100);
            if (!textarea.value.trim()) {
              textarea.value = 'Format Pesanan CS:\n- No. Resi: SPXID04829104829\n- Penerima: Hendra Jaya\n- Status: Siap Kirim';
            }
          }
          let advanced = false;
          const onInput = () => {
            if (!advanced && textarea && textarea.value.trim().length >= 4) {
              advanced = true;
              setTimeout(() => manager.goToStep(3), 500);
            }
          };
          textarea?.addEventListener('input', onInput);
          return () => textarea?.removeEventListener('input', onInput);
        }
      },
      {
        id: 'sp_step_add_tab',
        target: '#btn-sp-add-tab',
        fallbackTarget: '#scratchpad-header',
        title: '4. Tambah Tab Catatan Baru',
        desc: 'Butuh memisahkan catatan shift, draft komplain, atau data supplier? Klik tombol <b>[+]</b> untuk membuat tab catatan baru.',
        position: 'top',
        bindEvents: (manager) => {
          const btnAdd = document.getElementById('btn-sp-add-tab');
          const onAddClick = () => {
            setTimeout(() => manager.goToStep(4), 200);
          };
          btnAdd?.addEventListener('click', onAddClick, { once: true });
          return () => btnAdd?.removeEventListener('click', onAddClick);
        }
      },
      {
        id: 'sp_step_rename_tab',
        target: '#scratchpad-tabs .scratchpad-tab:first-child',
        fallbackTarget: '#scratchpad-tabs',
        title: '5. Ganti Nama Tab (Klik 2x)',
        desc: '<b>Tips Produktivitas:</b> Anda bisa mengganti nama tab catatan dengan melakukan <b>klik dua kali (Double Click)</b> pada judul tab!',
        position: 'top',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke Resize Ukuran →',
        bindEvents: (manager) => {
          const firstTab = document.querySelector('#scratchpad-tabs .scratchpad-tab:first-child');
          const onDblClick = () => {
            setTimeout(() => manager.goToStep(5), 300);
          };
          firstTab?.addEventListener('dblclick', onDblClick, { once: true });
          return () => firstTab?.removeEventListener('dblclick', onDblClick);
        }
      },
      {
        id: 'sp_step_resize_window',
        target: '.scratchpad-resize-handle.handle-tl',
        fallbackTarget: '#scratchpad-window',
        title: '6. Ubah Ukuran (Tarik Sudut Kiri-Atas)',
        desc: 'Karena posisi catatan ada di pojok kanan bawah, Anda bisa <b>menggeser sudut kiri-atas (atau tepi jendela)</b> untuk memperbesar/memperkecil area catatan secara leluasa!',
        position: 'left',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke Simpan File →',
        bindEvents: (manager) => {
          const handleTl = document.querySelector('.scratchpad-resize-handle.handle-tl');
          const onResizeStart = () => {
            setTimeout(() => manager.goToStep(6), 600);
          };
          handleTl?.addEventListener('mousedown', onResizeStart, { once: true });
          return () => handleTl?.removeEventListener('mousedown', onResizeStart);
        }
      },
      {
        id: 'sp_step_save_file',
        target: '#btn-sp-save',
        fallbackTarget: '.scratchpad-footer',
        title: '7. Simpan ke File (TXT / XLSX / DOCX)',
        desc: 'Klik tombol <b>"Save"</b> kapan saja untuk mengekspor isi tab catatan aktif ke dokumen file komputer Anda.',
        position: 'top',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke Buka File →',
        bindEvents: (manager) => {
          const btnSave = document.getElementById('btn-sp-save');
          const onSaveClick = () => {
            setTimeout(() => manager.goToStep(7), 300);
          };
          btnSave?.addEventListener('click', onSaveClick, { once: true });
          return () => btnSave?.removeEventListener('click', onSaveClick);
        }
      },
      {
        id: 'sp_step_load_file',
        target: '#btn-sp-load',
        fallbackTarget: '.scratchpad-footer',
        title: '8. Muat File Catatan (Load)',
        desc: 'Ingin membuka kembali file catatan lama? Klik tombol <b>"Load"</b> untuk membaca file TXT/Word/Excel dan membukanya otomatis di tab baru.',
        position: 'top',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke Tutup →',
        bindEvents: (manager) => {
          const btnLoad = document.getElementById('btn-sp-load');
          const onLoadClick = () => {
            setTimeout(() => manager.goToStep(8), 300);
          };
          btnLoad?.addEventListener('click', onLoadClick, { once: true });
          return () => btnLoad?.removeEventListener('click', onLoadClick);
        }
      },
      {
        id: 'sp_step_close_window',
        target: '#btn-scratchpad-close',
        fallbackTarget: '#scratchpad-header',
        title: '9. Selesai! Tutup Jendela Catatan 🎉',
        desc: 'Catatan Anda otomatis tersimpan aman di aplikasi! Klik tombol <b>[X]</b> di kanan atas header untuk menutup jendela catatan dan menyelesaikan panduan ini.',
        position: 'left',
        bindEvents: (manager) => {
          const btnClose = document.getElementById('btn-scratchpad-close');
          const onClose = () => {
            if (typeof notifyAction === 'function' || (window.OnboardingManager && typeof window.OnboardingManager.notifyAction === 'function')) {
              window.OnboardingManager.notifyAction('open_scratchpad');
            }
            setTimeout(() => manager.endTour(), 400);
          };
          btnClose?.addEventListener('click', onClose, { once: true });
          return () => btnClose?.removeEventListener('click', onClose);
        }
      }
    ],

    task_settings_cache: [
      {
        id: 'cache_step_open_settings',
        target: '#sidebar-user-card',
        fallbackTarget: '#sidebar',
        title: '1. Buka Menu Profil & Pengaturan',
        desc: 'Klik <b>Profil Pengguna</b> di bagian bawah sidebar untuk membuka menu dan masuk ke pusat konfigurasi dashboard.',
        position: 'right',
        allowNextButton: true,
        nextButtonLabel: 'Buka Pengaturan →',
        bindEvents: (manager) => {
          const overlay = document.getElementById('settings-overlay');
          if (overlay && overlay.classList.contains('active')) {
            setTimeout(() => manager.goToStep(1), 100);
            return;
          }
          const userCard = document.getElementById('sidebar-user-card');
          const popoverAccountBtn = document.getElementById('popover-btn-account');
          const onOpen = (e) => {
            if (typeof openSettings === 'function') openSettings();
            setTimeout(() => manager.goToStep(1), 150);
          };
          userCard?.addEventListener('click', onOpen, { once: true });
          popoverAccountBtn?.addEventListener('click', onOpen, { once: true });
          return () => {
            userCard?.removeEventListener('click', onOpen);
            popoverAccountBtn?.removeEventListener('click', onOpen);
          };
        }
      },
      {
        id: 'cache_step_click_tab',
        target: '#tab-btn-cache',
        fallbackTarget: '#settings-overlay .settings-tabs',
        title: '2. Buka Tab Cache & Data',
        desc: 'Klik tab <b>"Cache & Data"</b> untuk melihat status penggunaan memori cache dan kontrol pembersihan aman.',
        position: 'bottom',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke Pantau Ukuran →',
        bindEvents: (manager) => {
          const overlay = document.getElementById('settings-overlay');
          if (!overlay || !overlay.classList.contains('active')) {
            if (typeof openSettings === 'function') openSettings();
          }
          const tabBtn = document.getElementById('tab-btn-cache');
          const onClick = () => {
            setTimeout(() => manager.goToStep(2), 200);
          };
          tabBtn?.addEventListener('click', onClick, { once: true });
          return () => tabBtn?.removeEventListener('click', onClick);
        }
      },
      {
        id: 'cache_step_monitor_size',
        target: '#settings-pane-cache .settings-card:nth-child(1)',
        fallbackTarget: '#settings-cache-size-badge',
        title: '3. Pantau Ukuran Cache Aplikasi',
        desc: 'Di sini Anda bisa memantau total file sementara dan cache gambar yang tersimpan. Klik ikon refresh (🔄) kapan saja untuk menghitung ulang ukuran data.',
        position: 'bottom',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke Hibernasi →',
        bindEvents: (manager) => {
          const btnRefresh = document.getElementById('btn-refresh-cache-size');
          const onRefresh = () => {
            setTimeout(() => manager.goToStep(3), 200);
          };
          btnRefresh?.addEventListener('click', onRefresh, { once: true });
          return () => btnRefresh?.removeEventListener('click', onRefresh);
        }
      },
      {
        id: 'cache_step_hibernate',
        target: '#settings-pane-cache .settings-card:nth-child(2)',
        fallbackTarget: '#btn-hibernate-all',
        title: '4. Fitur Hibernasi Semua Tab Toko',
        desc: 'Jika komputer terasa berat saat membuka puluhan toko, tombol <b>"Hibernasi Semua Tab"</b> akan menidurkan tab-tab yang sedang tidak aktif untuk membebaskan RAM seketika (toko berstatus 🛡️ tetap terlindungi).',
        position: 'bottom',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke Cache Aman →',
        bindEvents: (manager) => {
          const btnHib = document.getElementById('btn-hibernate-all');
          const onHib = () => {
            setTimeout(() => manager.goToStep(4), 200);
          };
          btnHib?.addEventListener('click', onHib, { once: true });
          return () => btnHib?.removeEventListener('click', onHib);
        }
      },
      {
        id: 'cache_step_clean_safe',
        target: '#settings-pane-cache .settings-card:nth-child(3)',
        fallbackTarget: '#btn-clear-safe-cache',
        title: '5. Bersihkan Cache Aman (Tanpa Logout!)',
        desc: 'Fitur andalan CS! Tombol ini menghapus file sementara, shader GPU, dan cache stiker/gambar yang menumpuk <b>tanpa membuat Anda ter-logout dari marketplace</b>.<br><br>👉 Coba klik tombol <b>"Bersihkan Cache Aman"</b> sekarang!',
        position: 'top',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke Deep Clean →',
        bindEvents: (manager) => {
          const btnClean = document.getElementById('btn-clear-safe-cache');
          const onClean = () => {
            setTimeout(() => manager.goToStep(5), 350);
          };
          btnClean?.addEventListener('click', onClean, { once: true });
          return () => btnClean?.removeEventListener('click', onClean);
        }
      },
      {
        id: 'cache_step_deep_clean',
        target: '#settings-pane-cache .settings-card:nth-child(4)',
        fallbackTarget: '#btn-deep-clean-all',
        title: '6. Reset Sesi Total (Deep Clean)',
        desc: '⚠️ <i>Gunakan hanya jika terjadi kendala fatal:</i> Tombol ini akan menghapus seluruh data login dan sesi marketplace secara total untuk mereset aplikasi ke kondisi awal.',
        position: 'top',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke Selesai →',
        bindEvents: (manager) => {
          // Hanya bersifat edukatif agar user tidak sengaja me-reset total sesi toko aktifnya
          return () => {};
        }
      },
      {
        id: 'cache_step_close_settings',
        target: '#settings-close',
        fallbackTarget: '#settings-overlay .modal-header',
        title: '7. Selesai! Tutup Pengaturan 🎉',
        desc: 'Anda telah memahami seluruh manajemen performa & pembersihan cache aman CS! Klik tombol <b>[X]</b> di pojok kanan atas untuk menyelesaikan panduan ini.',
        position: 'left',
        bindEvents: (manager) => {
          const btnClose = document.getElementById('settings-close');
          const onClose = () => {
            if (typeof notifyAction === 'function' || (window.OnboardingManager && typeof window.OnboardingManager.notifyAction === 'function')) {
              window.OnboardingManager.notifyAction('open_settings_cache');
            }
            setTimeout(() => manager.endTour(), 400);
          };
          btnClose?.addEventListener('click', onClose, { once: true });
          return () => btnClose?.removeEventListener('click', onClose);
        }
      }
    ],

    task_whatsapp_linker: [
      {
        id: 'wa_step_open_fab',
        target: '#btn-cs-toolkit-fab',
        fallbackTarget: '#sidebar',
        title: '1. Buka Menu Tools CS (🛠️)',
        desc: 'Klik tombol mengambang <b>"Tools CS"</b> di pojok kanan bawah untuk membuka menu asisten dan utilitas cepat.',
        position: 'top',
        bindEvents: (manager) => {
          const menu = document.getElementById('cs-toolkit-menu');
          if (menu && menu.classList.contains('active')) {
            setTimeout(() => manager.goToStep(1), 100);
            return;
          }
          const fab = document.getElementById('btn-cs-toolkit-fab');
          const onClick = () => {
            setTimeout(() => manager.goToStep(1), 150);
          };
          fab?.addEventListener('click', onClick, { once: true });
          return () => fab?.removeEventListener('click', onClick);
        }
      },
      {
        id: 'wa_step_click_linker',
        target: '#tool-item-walinker',
        fallbackTarget: '#cs-toolkit-menu',
        title: '2. Buka WhatsApp Direct Linker',
        desc: 'Klik menu <b>"WhatsApp Direct Linker"</b> untuk membuka generator tautan chat wa.me otomatis.',
        position: 'left',
        bindEvents: (manager) => {
          const item = document.getElementById('tool-item-walinker');
          const onClick = () => {
            setTimeout(() => manager.goToStep(2), 200);
          };
          item?.addEventListener('click', onClick, { once: true });
          return () => item?.removeEventListener('click', onClick);
        }
      },
      {
        id: 'wa_step_input_phone',
        target: '#wa-input-phone',
        fallbackTarget: '#modal-walinker',
        title: '3. Ketik Nomor HP Pembeli',
        desc: 'Ketik nomor HP pelanggan (misal: <code>081234567890</code>). Sistem otomatis menormalkan ke format internasional (+62) dan membuat tautan wa.me instan!',
        position: 'bottom',
        allowNextButton: true,
        nextButtonLabel: 'Lanjut ke Selesai →',
        bindEvents: (manager) => {
          const input = document.getElementById('wa-input-phone');
          if (input) {
            setTimeout(() => input.focus(), 80);
          }
          return () => {};
        }
      },
      {
        id: 'wa_step_close',
        target: '#btn-walinker-close',
        fallbackTarget: '#modal-walinker-overlay .modal-header',
        title: '4. Selesai! Tutup WA Linker 🎉',
        desc: 'Anda bisa langsung menyalin tautan atau membuka WhatsApp ke pembeli. Klik <b>[X]</b> untuk menyelesaikan tugas ini.',
        position: 'left',
        bindEvents: (manager) => {
          const btnClose = document.getElementById('btn-walinker-close');
          const onClose = () => {
            if (typeof notifyAction === 'function' || (window.OnboardingManager && typeof window.OnboardingManager.notifyAction === 'function')) {
              window.OnboardingManager.notifyAction('use_walinker');
            }
            setTimeout(() => manager.endTour(), 400);
          };
          btnClose?.addEventListener('click', onClose, { once: true });
          return () => btnClose?.removeEventListener('click', onClose);
        }
      }
    ],

    task_network_sop: [
      {
        id: 'net_step_avatar_status',
        target: '#cs-user-avatar',
        fallbackTarget: '#user-profile-bar',
        title: '1. Indikator Status Ping Real-Time',
        desc: 'Titik hijau/merah pada avatar CS Anda memantau konektivitas internet secara otomatis setiap 20 detik.',
        position: 'right',
        allowNextButton: true,
        nextButtonLabel: 'Buka SOP Tethering →',
        bindEvents: (manager) => {
          return () => {};
        }
      },
      {
        id: 'net_step_open_sop',
        target: '#btn-net-guide-done',
        fallbackTarget: '#modal-network-guide',
        title: '2. Modal SOP Penambatan HP 6 Langkah',
        desc: 'Saat internet kantor bermasalah, buka SOP 6 langkah ini untuk mengaktifkan USB/Wi-Fi Tethering HP darurat dan menjaga toko tetap online. Klik tombol di bawah untuk menyelesaikan.',
        position: 'top',
        bindEvents: (manager) => {
          if (window.NetworkMonitor && typeof window.NetworkMonitor.openGuide === 'function') {
            window.NetworkMonitor.openGuide();
          }
          const btnDone = document.getElementById('btn-net-guide-done');
          const onDone = () => {
            if (typeof notifyAction === 'function' || (window.OnboardingManager && typeof window.OnboardingManager.notifyAction === 'function')) {
              window.OnboardingManager.notifyAction('open_network_sop');
            }
            setTimeout(() => manager.endTour(), 400);
          };
          btnDone?.addEventListener('click', onDone, { once: true });
          return () => btnDone?.removeEventListener('click', onDone);
        }
      }
    ]
  },

  // Interactive Checklist Tasks (Hands-on CS Exploration)
  checklistTasks: [
    {
      id: 'task_add_store',
      title: 'Tambah Toko Marketplace Pertama',
      desc: 'Tambahkan toko Shopee, Tokopedia, Lazada, atau Custom URL.',
      actionKey: 'add_store',
      btnLabel: 'Tambah Toko'
    },
    {
      id: 'task_open_tab',
      title: 'Buka Tab Baru / Navigasi Toko',
      desc: 'Klik salah satu toko di sidebar, lalu klik tombol [+] pada bar tab (atau Ctrl+Klik tautan).',
      actionKey: 'open_tab',
      btnLabel: 'Buka Tab (+)'
    },
    {
      id: 'task_quick_reply',
      title: 'Coba Smart Quick Reply (Ctrl+Space)',
      desc: 'Buka drawer atau gunakan template balasan otomatis.',
      actionKey: 'use_quickreply',
      btnLabel: 'Coba Quick Reply'
    },
    {
      id: 'task_whatsapp_linker',
      title: 'Coba WhatsApp Direct Linker (wa.me)',
      desc: 'Buat tautan chat wa.me otomatis dari nomor HP atau Smart Clipboard.',
      actionKey: 'use_walinker',
      btnLabel: 'Buka WA Linker'
    },
    {
      id: 'task_scratchpad',
      title: 'Buka & Buat Catatan di Scratchpad',
      desc: 'Buka jendela floating scratchpad untuk draft teks CS.',
      actionKey: 'open_scratchpad',
      btnLabel: 'Buka Catatan'
    },
    {
      id: 'task_customer_notes',
      title: 'Gunakan Catatan Pembeli / Warning COD',
      desc: 'Buka database pembeli & catatan retur pelanggan.',
      actionKey: 'use_cnotes',
      btnLabel: 'Catatan Pembeli'
    },
    {
      id: 'task_network_sop',
      title: 'Pantau Latensi & SOP Tethering HP',
      desc: 'Cek status ping 20s real-time dan infografik 6 langkah backup tethering darurat.',
      actionKey: 'open_network_sop',
      btnLabel: 'SOP Tethering'
    },
    {
      id: 'task_settings_cache',
      title: 'Pelajari Fitur Bersihkan Cache Aman',
      desc: 'Buka tab Cache & Data di menu Pengaturan.',
      actionKey: 'open_settings_cache',
      btnLabel: 'Buka Cache'
    }
  ]
};

// ── ONBOARDING MANAGER CORE ──────────────────────────────────────────────────
const OnboardingManager = {
  currentTourStepIndex: 0,
  isTourActive: false,
  currentTourType: 'main', // 'main' | 'task_guide'
  currentGuideTaskId: null,
  currentStepCleanup: null,
  trackingRafId: null,
  lastTargetRect: null,
  resizeListenerBound: false,
  secretClickCount: 0,
  secretClickTimer: null,

  init() {
    this.injectElements();
    const state = this.getState();
    if (!state.checklistDismissed) {
      this.renderChecklistWidget();
    }
  },

  // ── State Persistence (User-Scoped) ────────────────────────────────────────
  getState() {
    const defaultState = {
      seenVersion: null,
      completedTours: [],
      completedTasks: [],
      checklistDismissed: false,
      checklistCollapsed: false
    };
    try {
      if (window.Storage && typeof window.Storage.get === 'function') {
        const saved = window.Storage.get('onboarding_state', defaultState, true);
        if (saved && typeof saved === 'object') {
          return {
            ...defaultState,
            ...saved,
            completedTours: Array.isArray(saved.completedTours) ? saved.completedTours : [],
            completedTasks: Array.isArray(saved.completedTasks) ? saved.completedTasks : []
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load onboarding state:', e);
    }
    return defaultState;
  },

  saveState(state) {
    try {
      if (window.Storage && typeof window.Storage.set === 'function') {
        window.Storage.set('onboarding_state', state, true);
      }
    } catch (e) {
      console.warn('Failed to save onboarding state:', e);
    }
  },

  getActiveSteps() {
    if (this.currentTourType === 'task_guide' && this.currentGuideTaskId && ONBOARDING_CONFIG.taskGuides?.[this.currentGuideTaskId]) {
      return ONBOARDING_CONFIG.taskGuides[this.currentGuideTaskId];
    }
    return ONBOARDING_CONFIG.tourSteps;
  },

  sandboxTemplateSelectHandler: null,

  renderQuickReplySandbox() {
    let sandbox = document.getElementById('onboarding-qr-sandbox');
    if (!sandbox) {
      sandbox = document.createElement('div');
      sandbox.id = 'onboarding-qr-sandbox';
      sandbox.className = 'onboarding-qr-sandbox';
      sandbox.innerHTML = `
        <div class="sandbox-header">
          <span class="sandbox-badge">🎯 Area Uji Coba Chat CS (Simulasi)</span>
          <span class="sandbox-clip-hint">Clipboard Aktif: <code>SPXID04829104829</code></span>
        </div>
        <div class="sandbox-input-wrapper">
          <input type="text" id="onboarding-sandbox-input" class="sandbox-input" placeholder="Klik di sini, lalu tekan Ctrl + Space..." autocomplete="off" />
        </div>
        <div id="onboarding-sandbox-dropdown" class="sandbox-dropdown" style="display:none;"></div>
      `;
      document.body.appendChild(sandbox);
    }
    sandbox.style.display = 'flex';
  },

  showSandboxDropdown(query = '') {
    this.renderQuickReplySandbox();
    const dropdown = document.getElementById('onboarding-sandbox-dropdown');
    if (!dropdown) return;

    const templates = typeof smartTemplates !== 'undefined' && smartTemplates.length > 0 
      ? smartTemplates 
      : (typeof DEFAULT_SMART_TEMPLATES !== 'undefined' ? DEFAULT_SMART_TEMPLATES : []);

    const clip = typeof currentClipboardValue !== 'undefined' && currentClipboardValue ? currentClipboardValue : 'SPXID04829104829';

    const cleanQ = (query || '').toLowerCase().trim();
    let filtered = templates.filter(tpl => {
      if (!cleanQ) return true;
      const titleMatch = (tpl.title || '').toLowerCase().includes(cleanQ);
      const contentMatch = (tpl.content || '').toLowerCase().includes(cleanQ);
      return titleMatch || contentMatch;
    });

    if (filtered.length === 0) {
      dropdown.innerHTML = `
        <div style="padding: 16px; text-align: center; font-size: 12px; color: var(--text-muted);">
          🔍 Tidak ada template yang cocok dengan kata kunci "<b>${escapeHtml(cleanQ)}</b>"
        </div>
      `;
      dropdown.style.display = 'flex';
      return;
    }

    dropdown.innerHTML = filtered.slice(0, 6).map((tpl, idx) => {
      const resolved = typeof resolveTemplateVariables === 'function' 
        ? resolveTemplateVariables(tpl.content, { clipboard: clip }) 
        : tpl.content;
      
      let highlightedSnippet = escapeHtml(resolved);
      let highlightedTitle = escapeHtml(tpl.title);

      if (cleanQ) {
        try {
          const regex = new RegExp(`(${cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          highlightedSnippet = highlightedSnippet.replace(regex, '<mark style="background: rgba(223, 22, 131, 0.25); color: #df1683; padding: 1px 3px; border-radius: 3px; font-weight: 700;">$1</mark>');
          highlightedTitle = highlightedTitle.replace(regex, '<mark style="background: rgba(223, 22, 131, 0.25); color: #df1683; padding: 1px 3px; border-radius: 3px; font-weight: 700;">$1</mark>');
        } catch (e) {}
      }

      return `
        <div class="sandbox-dropdown-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
          <div class="item-title">
            <span>${highlightedTitle}</span>
            <span style="font-size:10px; color:#df1683; font-weight:700;">[#${idx + 1}]</span>
          </div>
          <div class="item-snippet">${highlightedSnippet}</div>
        </div>
      `;
    }).join('');

    dropdown.style.display = 'flex';

    dropdown.querySelectorAll('.sandbox-dropdown-item').forEach((item, i) => {
      item.addEventListener('click', () => {
        const tpl = filtered[i];
        const resolved = typeof resolveTemplateVariables === 'function' 
          ? resolveTemplateVariables(tpl.content, { clipboard: clip }) 
          : tpl.content;
        if (typeof this.sandboxTemplateSelectHandler === 'function') {
          this.sandboxTemplateSelectHandler(resolved);
        }
      });
    });
  },

  removeQuickReplySandbox() {
    const sandbox = document.getElementById('onboarding-qr-sandbox');
    if (sandbox) {
      sandbox.remove();
    }
  },

  cleanupCurrentStep() {
    this.stopActiveSpotlightTracking();
    this.removeQuickReplySandbox();
    if (typeof this.currentStepCleanup === 'function') {
      try {
        this.currentStepCleanup();
      } catch (e) {
        console.warn('Error during step cleanup:', e);
      }
      this.currentStepCleanup = null;
    }
  },

  startActiveSpotlightTracking(step) {
    this.stopActiveSpotlightTracking();

    const track = () => {
      if (!this.isTourActive) return;

      const currentStep = this.getActiveSteps()[this.currentTourStepIndex];
      if (!currentStep || currentStep.id !== step.id) return;

      const isToolkitMenuOpenStep = step.id === 'step_cs_toolkit' || 
                                    step.id === 'qr_step_click_dial' || 
                                    (step.target && step.target.includes('tool-item-'));

      if (isToolkitMenuOpenStep) {
        const container = document.getElementById('cs-toolkit-fab-container');
        const fab = document.getElementById('btn-cs-toolkit-fab');
        if (container) container.classList.add('open');
        if (fab) fab.classList.add('active');
      }

      let targetEl = document.querySelector(step.target);
      if (!this.isElementVisible(targetEl) && step.fallbackTarget) {
        const fbEl = document.querySelector(step.fallbackTarget);
        if (this.isElementVisible(fbEl)) {
          targetEl = fbEl;
        }
      }

      if (targetEl && this.isElementVisible(targetEl)) {
        const rect = targetEl.getBoundingClientRect();
        const last = this.lastTargetRect;
        if (!last || Math.abs(rect.left - last.left) > 1 || Math.abs(rect.top - last.top) > 1 || Math.abs(rect.width - last.width) > 1 || Math.abs(rect.height - last.height) > 1) {
          this.lastTargetRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
          this.positionTourPopover(step);
        }
      }

      this.trackingRafId = requestAnimationFrame(track);
    };

    this.trackingRafId = requestAnimationFrame(track);
  },

  stopActiveSpotlightTracking() {
    if (this.trackingRafId) {
      cancelAnimationFrame(this.trackingRafId);
      this.trackingRafId = null;
    }
    this.lastTargetRect = null;
  },

  // ── Init Method ────────────────────────────────────────────────────────────
  init() {
    this.injectElements();
    this.bindGlobalEvents();

    const state = this.getState();

    // Cek apakah versi ini belum pernah dilihat oleh pengguna saat ini
    const isNewVersion = state.seenVersion !== ONBOARDING_CONFIG.version;
    if (isNewVersion) {
      // Tampilkan Welcome Modal secara otomatis pada login pertama versi baru
      setTimeout(() => {
        this.showWelcomeModal();
      }, 500);
    }

    // Render / Update widget checklist
    this.renderChecklistWidget();
  },

  // ── Inject Necessary HTML Containers if not present ────────────────────────
  injectElements() {
    // 1. Welcome Modal with Horizontal Multi-Version Carousel
    if (!document.getElementById('onboarding-welcome-modal-overlay')) {
      const welcomeOverlay = document.createElement('div');
      welcomeOverlay.id = 'onboarding-welcome-modal-overlay';
      welcomeOverlay.className = 'modal-overlay';
      welcomeOverlay.innerHTML = `
        <div class="onboarding-welcome-modal" role="dialog" aria-labelledby="onboarding-welcome-title" aria-modal="true">
          <button class="onboarding-welcome-close-top" id="btn-onboarding-welcome-x" onclick="if (window.OnboardingManager) { window.OnboardingManager.closeWelcomeModal(); } else { document.getElementById('onboarding-welcome-modal-overlay')?.classList.remove('active'); }" title="Tutup Modal (Esc)" aria-label="Tutup">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>

          <div class="onboarding-welcome-hero">
            <div class="onboarding-hero-glow"></div>
            <div class="onboarding-hero-icon">
              <img src="assets/icon.ico" alt="Logo">
            </div>
            <div class="onboarding-hero-text">
              <h2 id="onboarding-welcome-title">
                ${ONBOARDING_CONFIG.welcomeTitle}
                <span class="onboarding-version-badge">v${ONBOARDING_CONFIG.version} Siap Produksi 🚀</span>
              </h2>
              <p>${ONBOARDING_CONFIG.welcomeSubtitle}</p>
            </div>
          </div>

          <!-- Horizontal Version Navigator Carousel Bar -->
          <div class="onboarding-version-carousel-section">
            <div class="onboarding-carousel-top-bar">
              <span class="onboarding-carousel-title-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Pilih Riwayat Versi Aplikasi (v1.0.0 — v1.0.9)
              </span>
              <span class="onboarding-carousel-hint">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                Geser / Klik pill versi untuk melihat update
              </span>
            </div>
            <div class="onboarding-version-carousel-bar">
              <button class="onboarding-carousel-nav-btn" id="btn-ver-carousel-prev" title="Versi Lebih Baru (Geser Kiri)" aria-label="Versi Lebih Baru">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div class="onboarding-version-pills-track" id="onboarding-version-pills-track" role="tablist" aria-label="Daftar Versi">
                <!-- Populated dynamically by renderVersionPills() -->
              </div>
              <button class="onboarding-carousel-nav-btn" id="btn-ver-carousel-next" title="Versi Lebih Lama (Geser Kanan)" aria-label="Versi Lebih Lama">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>

          <!-- Dynamic Version Content Body -->
          <div class="onboarding-welcome-body" id="onboarding-version-content-area">
            <!-- Populated dynamically by renderVersionContent() -->
          </div>

          <div class="onboarding-welcome-footer">
            <div class="onboarding-welcome-footer-left">
              <span>💡 Panduan & Riwayat Changelog bisa dibuka kapan saja dari menu Pengaturan.</span>
            </div>
            <div class="onboarding-welcome-footer-right">
              <button class="btn-secondary" id="btn-onboarding-welcome-close" onclick="if (window.OnboardingManager) { window.OnboardingManager.closeWelcomeModal(); } else { document.getElementById('onboarding-welcome-modal-overlay')?.classList.remove('active'); }">Tutup & Eksplorasi</button>
              <button class="btn-primary" id="btn-onboarding-start-tour">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Mulai Tur Panduan 🎯
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(welcomeOverlay);

      // Bind buttons inside welcome modal
      document.getElementById('btn-onboarding-welcome-x')?.addEventListener('click', () => {
        this.closeWelcomeModal();
      });
      document.getElementById('btn-onboarding-welcome-close')?.addEventListener('click', () => {
        this.closeWelcomeModal();
      });
      document.getElementById('btn-onboarding-start-tour')?.addEventListener('click', () => {
        this.closeWelcomeModal();
        setTimeout(() => this.startTour(), 250);
      });
      welcomeOverlay.addEventListener('click', (e) => {
        if (e.target === welcomeOverlay) {
          this.closeWelcomeModal();
        }
      });

      // Bind carousel arrow navigation
      document.getElementById('btn-ver-carousel-prev')?.addEventListener('click', () => {
        this.selectVersion(this.activeVersionIndex - 1);
      });
      document.getElementById('btn-ver-carousel-next')?.addEventListener('click', () => {
        this.selectVersion(this.activeVersionIndex + 1);
      });

      // Bind mouse wheel horizontal scroll on pills track
      const pillsTrack = document.getElementById('onboarding-version-pills-track');
      pillsTrack?.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          pillsTrack.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    }

    // 2. Guided Tour Overlay & Popover
    if (!document.getElementById('onboarding-tour-overlay')) {
      const tourOverlay = document.createElement('div');
      tourOverlay.id = 'onboarding-tour-overlay';
      tourOverlay.className = 'onboarding-tour-overlay';
      tourOverlay.innerHTML = `
        <svg class="onboarding-tour-svg-backdrop" id="onboarding-tour-svg">
          <defs>
            <mask id="onboarding-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect id="onboarding-mask-cutout" x="0" y="0" width="0" height="0" rx="12" ry="12" fill="black" />
            </mask>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="rgba(0, 0, 0, 0.72)" mask="url(#onboarding-spotlight-mask)" />
        </svg>
        <div class="onboarding-spotlight-frame pulsing" id="onboarding-spotlight-frame"></div>
        <div class="onboarding-tour-popover" id="onboarding-tour-popover" role="dialog" aria-modal="true">
          <div class="onboarding-tour-popover-header">
            <span class="onboarding-tour-step-badge" id="onboarding-tour-step-badge">Langkah 1/5</span>
            <button class="onboarding-tour-close-btn" id="btn-onboarding-tour-close" title="Tutup Tur (Esc)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <h3 class="onboarding-tour-title" id="onboarding-tour-title">Judul Langkah</h3>
          <p class="onboarding-tour-desc" id="onboarding-tour-desc">Deskripsi langkah tur di sini...</p>
          <div class="onboarding-tour-footer">
            <div class="onboarding-tour-dots" id="onboarding-tour-dots"></div>
            <div class="onboarding-tour-actions">
              <button class="btn-secondary" id="btn-onboarding-tour-prev" style="padding: 4px 10px; font-size: 11.5px;">Sebelumnya</button>
              <button class="btn-primary" id="btn-onboarding-tour-next" style="padding: 4px 12px; font-size: 11.5px;">Lanjut &rarr;</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(tourOverlay);

      // Bind tour navigation buttons
      document.getElementById('btn-onboarding-tour-close')?.addEventListener('click', () => this.endTour());
      document.getElementById('btn-onboarding-tour-prev')?.addEventListener('click', () => this.prevTourStep());
      document.getElementById('btn-onboarding-tour-next')?.addEventListener('click', () => this.nextTourStep());
    }

    // 3. Floating Checklist Setup Widget
    if (!document.getElementById('onboarding-checklist-widget')) {
      const checklistWidget = document.createElement('div');
      checklistWidget.id = 'onboarding-checklist-widget';
      checklistWidget.className = 'onboarding-checklist-widget';
      checklistWidget.setAttribute('role', 'region');
      checklistWidget.setAttribute('aria-label', 'Checklist Onboarding CS');
      const dock = document.getElementById('floating-bottom-dock');
      if (dock) {
        dock.appendChild(checklistWidget);
      } else {
        document.body.appendChild(checklistWidget);
      }
    }
  },

  // ── Global Keyboard & Event Hooks ──────────────────────────────────────────
  bindGlobalEvents() {
    if (!this.resizeListenerBound) {
      window.addEventListener('resize', () => {
        if (this.isTourActive) {
          this.positionTourPopover(this.getActiveSteps()[this.currentTourStepIndex]);
        }
      });

      window.addEventListener('keydown', (e) => {
        // Tombol Rahasia Keyboard: Ctrl + Alt + R atau Ctrl + Shift + O
        if ((e.ctrlKey && e.altKey && (e.key === 'r' || e.key === 'R')) || 
            (e.ctrlKey && e.shiftKey && (e.key === 'O' || e.key === 'o'))) {
          e.preventDefault();
          this.resetChecklistTasks();
          return;
        }

        if (this.isTourActive) {
          if (e.key === 'Escape') {
            this.endTour();
          } else if (e.key === 'ArrowRight') {
            this.nextTourStep();
          } else if (e.key === 'ArrowLeft') {
            this.prevTourStep();
          }
        } else {
          const welcomeModal = document.getElementById('onboarding-welcome-modal-overlay');
          if (welcomeModal && welcomeModal.classList.contains('active')) {
            if (e.key === 'Escape') {
              this.closeWelcomeModal();
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              this.selectVersion(this.activeVersionIndex - 1);
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              this.selectVersion(this.activeVersionIndex + 1);
            }
          }
        }
      });

      this.resizeListenerBound = true;
    }
  },

  // ── Welcome Modal Controls & Multi-Version Carousel ────────────────────────
  activeVersionIndex: 0,

  renderVersionPills() {
    const track = document.getElementById('onboarding-version-pills-track');
    if (!track) return;
    track.innerHTML = '';
    const versions = ONBOARDING_CONFIG.versions || [];
    versions.forEach((ver, idx) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `onboarding-version-pill ${idx === this.activeVersionIndex ? 'active' : ''}`;
      pill.id = `onboarding-ver-pill-${ver.version.replace(/\./g, '_')}`;
      const tagText = idx === 0 ? 'Terbaru' : (ver.badge.split(' ')[0] || `v${ver.version}`);
      pill.innerHTML = `
        <span>v${ver.version}</span>
        <span class="onboarding-version-pill-tag">${tagText}</span>
      `;
      pill.addEventListener('click', () => {
        this.selectVersion(idx);
      });
      track.appendChild(pill);
    });
  },

  renderVersionContent() {
    const contentArea = document.getElementById('onboarding-version-content-area');
    if (!contentArea) return;
    const versions = ONBOARDING_CONFIG.versions || [];
    const total = versions.length;
    const ver = versions[this.activeVersionIndex] || versions[0];
    if (!ver) return;

    const prevVerObj = versions[this.activeVersionIndex + 1];
    const nextVerObj = versions[this.activeVersionIndex - 1];

    contentArea.innerHTML = `
      <!-- 1. Version Milestone Header Banner -->
      <div class="onboarding-version-header-banner">
        <div class="onboarding-version-banner-top">
          <div class="onboarding-version-title-group">
            <h3>
              Versi ${ver.version}
              <span class="onboarding-version-badge" style="background: ${ver.badgeColor || '#df1683'}">${ver.badge}</span>
            </h3>
            <span class="onboarding-version-date">Rilis: ${ver.releaseDate}</span>
          </div>
          <span class="onboarding-version-index-badge">Rilis ${this.activeVersionIndex + 1} dari ${total}</span>
        </div>
        <p class="onboarding-version-tagline"><strong>${ver.title}</strong> — ${ver.tagline}</p>
      </div>

      <!-- 2. Highlights & Keunggulan Versi -->
      <div>
        <div class="onboarding-section-title">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          Highlight Fitur Utama (v${ver.version})
        </div>
        <div class="onboarding-cards-grid">
          ${(ver.highlights || []).map(c => `
            <div class="onboarding-info-card">
              <div class="onboarding-info-card-icon" style="background:${c.iconBg}">${c.icon}</div>
              <div class="onboarding-info-card-content">
                <h4>${c.title}</h4>
                <p>${c.desc}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 3. Catatan Rilis Lengkap -->
      <div class="onboarding-changelog-box">
        <div class="onboarding-changelog-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <span>Catatan Rilis Lengkap (v${ver.version}):</span>
        </div>
        ${ver.categories ? `
          <div class="onboarding-changelog-categories">
            ${ver.categories.map(cat => `
              <div class="onboarding-changelog-category-group">
                <div class="onboarding-changelog-cat-header">
                  <span class="onboarding-changelog-cat-badge" style="color: ${cat.color}; background: ${cat.bgColor}; border: 1px solid ${cat.color}33;">${cat.tag}</span>
                  <strong class="onboarding-changelog-cat-title">${cat.category}</strong>
                </div>
                <ul class="onboarding-changelog-list">
                  ${cat.items.map(item => `<li>${item}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
        ` : `
          <ul class="onboarding-changelog-list">
            ${(ver.items || []).map(item => `<li>${item}</li>`).join('')}
          </ul>
        `}
      </div>

      <!-- 4. Bottom Horizontal Navigation Controls -->
      <div class="onboarding-version-bottom-nav">
        <button class="btn-secondary" id="btn-ver-prev-card" style="padding: 5px 12px; font-size: 11.5px;" ${!prevVerObj ? 'disabled' : ''}>
          &larr; ${prevVerObj ? `v${prevVerObj.version}` : 'Versi Awal'}
        </button>
        <div class="onboarding-version-dots">
          ${versions.map((v, i) => `
            <div class="onboarding-version-dot ${i === this.activeVersionIndex ? 'active' : ''}" data-idx="${i}" title="Ke v${v.version} (${v.title})"></div>
          `).join('')}
        </div>
        <button class="btn-secondary" id="btn-ver-next-card" style="padding: 5px 12px; font-size: 11.5px;" ${!nextVerObj ? 'disabled' : ''}>
          ${nextVerObj ? `v${nextVerObj.version}` : 'Versi Terbaru'} &rarr;
        </button>
      </div>
    `;

    // Bind bottom pagination events
    document.getElementById('btn-ver-prev-card')?.addEventListener('click', () => {
      if (prevVerObj) this.selectVersion(this.activeVersionIndex + 1);
    });
    document.getElementById('btn-ver-next-card')?.addEventListener('click', () => {
      if (nextVerObj) this.selectVersion(this.activeVersionIndex - 1);
    });
    contentArea.querySelectorAll('.onboarding-version-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const idx = parseInt(dot.dataset.idx, 10);
        if (!isNaN(idx)) this.selectVersion(idx);
      });
    });
  },

  selectVersion(index) {
    const versions = ONBOARDING_CONFIG.versions || [];
    if (!versions.length) return;
    const clampedIndex = Math.max(0, Math.min(index, versions.length - 1));
    this.activeVersionIndex = clampedIndex;

    const track = document.getElementById('onboarding-version-pills-track');
    if (track) {
      const pills = track.querySelectorAll('.onboarding-version-pill');
      pills.forEach((p, i) => {
        const isActive = (i === clampedIndex);
        p.classList.toggle('active', isActive);
        if (isActive) {
          // Scroll ONLY the pills track horizontally without shifting ancestors/modal
          const targetLeft = p.offsetLeft - (track.clientWidth / 2) + (p.clientWidth / 2);
          track.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
        }
      });
    }

    const btnPrev = document.getElementById('btn-ver-carousel-prev');
    const btnNext = document.getElementById('btn-ver-carousel-next');
    if (btnPrev) btnPrev.disabled = (clampedIndex === 0);
    if (btnNext) btnNext.disabled = (clampedIndex === versions.length - 1);

    this.renderVersionContent();
  },

  showWelcomeModal(force = false) {
    this.injectElements();
    this.renderVersionPills();
    this.selectVersion(0);
    const modal = document.getElementById('onboarding-welcome-modal-overlay');
    if (modal) {
      modal.classList.add('active');
    }
    if (window.AppTelemetry) {
      window.AppTelemetry.track('changelog_modal_opened');
    }
  },

  closeWelcomeModal() {
    const modal = document.getElementById('onboarding-welcome-modal-overlay');
    if (modal) {
      modal.classList.remove('active');
    }
    try {
      const mgr = (typeof OnboardingManager !== 'undefined') ? OnboardingManager : this;
      if (mgr && typeof mgr.getState === 'function') {
        const state = mgr.getState();
        state.seenVersion = ONBOARDING_CONFIG.version;
        mgr.saveState(state);
      }
    } catch (err) {
      console.warn('Could not save seenVersion:', err);
    }
  },

  // ── Step-by-Step Guided Tour & Task Action Guides ───────────────────────────
  startTour(startStepIndex = 0) {
    this.cleanupCurrentStep();
    this.currentTourType = 'main';
    this.currentGuideTaskId = null;
    this.injectElements();
    this.currentTourStepIndex = startStepIndex;
    this.isTourActive = true;

    if (window.AppTelemetry) {
      window.AppTelemetry.track('tour_started');
    }

    const overlay = document.getElementById('onboarding-tour-overlay');
    if (overlay) {
      overlay.classList.remove('task-guide-mode');
      overlay.classList.add('active');
    }

    this.renderTourStep();
  },

  startTaskGuide(taskId, startStepIndex = 0) {
    // 1. Cek kondisi khusus halaman untuk task_open_tab
    if (taskId === 'task_open_tab') {
      if (typeof stores === 'undefined' || !stores || stores.length === 0) {
        if (typeof showToast === 'function') {
          showToast('Silakan tambahkan toko pertama Anda terlebih dahulu.', 'info');
        }
        return this.startTaskGuide('task_add_store');
      }

      // Jika belum ada toko yang aktif/terpilih, mulai dari langkah 1 (klik toko di sidebar).
      // Jika sudah ada toko aktif di workspace, langsung mulai dari langkah 2 (klik tombol [+]).
      if (typeof activeStoreId === 'undefined' || !activeStoreId) {
        startStepIndex = 0;
      } else {
        startStepIndex = 1;
      }
    }

    const guideSteps = ONBOARDING_CONFIG.taskGuides?.[taskId];
    if (!guideSteps || guideSteps.length === 0) {
      return;
    }

    this.cleanupCurrentStep();
    this.currentTourType = 'task_guide';
    this.currentGuideTaskId = taskId;
    this.injectElements();
    this.currentTourStepIndex = startStepIndex;
    this.isTourActive = true;

    const overlay = document.getElementById('onboarding-tour-overlay');
    if (overlay) {
      overlay.classList.add('active', 'task-guide-mode');
    }

    this.renderTourStep();
  },

  syncStepContext(step, stepIndex, taskId) {
    if (!step) return;

    // ── 0. Main Guided Tour (startTour) ──
    if (this.currentTourType === 'main') {
      if (step.id === 'step_sidebar_stores') {
        if (typeof closeModal === 'function') closeModal();
        if (typeof closeSettings === 'function') closeSettings();
        if (typeof closeQuickReplyDrawer === 'function') closeQuickReplyDrawer();
        if (typeof closeCustomerNotesModal === 'function') closeCustomerNotesModal();
        if (typeof closeScratchpad === 'function') closeScratchpad();
        if (typeof window.closeToolkitMenu === 'function') window.closeToolkitMenu();
        this.restoreTabBarIfNeeded();
      } else if (step.id === 'step_tab_bar') {
        if (!activeStoreId) this.renderDemoTabBar();
        if (typeof window.closeToolkitMenu === 'function') window.closeToolkitMenu();
      } else if (step.id === 'step_main_webview') {
        this.restoreTabBarIfNeeded();
        if (typeof window.closeToolkitMenu === 'function') window.closeToolkitMenu();
      } else if (step.id === 'step_cs_toolkit') {
        this.restoreTabBarIfNeeded();
        if (typeof window.toggleToolkitMenu === 'function') window.toggleToolkitMenu(true);
      } else if (step.id === 'step_statusbar') {
        if (typeof window.closeToolkitMenu === 'function') window.closeToolkitMenu();
      }
      return;
    }

    // ── 1. Task: Tambah Toko Marketplace (task_add_store) ──
    if (taskId === 'task_add_store') {
      const modalOverlay = document.getElementById('modal-overlay');
      if (stepIndex === 0) {
        if (modalOverlay?.classList.contains('active') && typeof closeModal === 'function') {
          closeModal();
        }
      } else {
        if (!modalOverlay?.classList.contains('active') && typeof openAddModal === 'function') {
          openAddModal();
        }
      }
    }

    // ── 2. Task: Buka Tab Baru / Navigasi (task_open_tab) ──
    if (taskId === 'task_open_tab') {
      if (!activeStoreId) {
        this.renderDemoTabBar();
      }
    }

    // ── 3. Task: Smart Quick Reply (task_quick_reply) ──
    if (taskId === 'task_quick_reply') {
      // Langkah 1 (Buka FAB)
      if (stepIndex === 0) {
        if (typeof closeQuickReplyDrawer === 'function') closeQuickReplyDrawer();
        if (typeof closeAddTemplateModal === 'function') closeAddTemplateModal();
        this.removeQuickReplySandbox();
        if (typeof window.closeToolkitMenu === 'function') window.closeToolkitMenu();
      }
      // Langkah 2 (Pilih Quick Reply di Dial)
      else if (stepIndex === 1) {
        if (typeof closeQuickReplyDrawer === 'function') closeQuickReplyDrawer();
        if (typeof closeAddTemplateModal === 'function') closeAddTemplateModal();
        this.removeQuickReplySandbox();
        if (typeof window.toggleToolkitMenu === 'function') window.toggleToolkitMenu(true);
      }
      // Langkah 3 (Klik Tambah Template di Drawer)
      else if (stepIndex === 2) {
        if (typeof window.closeToolkitMenu === 'function') window.closeToolkitMenu();
        if (typeof closeAddTemplateModal === 'function') closeAddTemplateModal();
        this.removeQuickReplySandbox();
        if (typeof openQuickReplyDrawer === 'function') openQuickReplyDrawer();
      }
      // Langkah 4 - 7 (Form Modal Tambah Template)
      else if (stepIndex >= 3 && stepIndex <= 6) {
        if (typeof window.closeToolkitMenu === 'function') window.closeToolkitMenu();
        this.removeQuickReplySandbox();
        const tplOverlay = document.getElementById('modal-template-overlay');
        if (!tplOverlay?.classList.contains('active') && typeof openAddTemplateModal === 'function') {
          openAddTemplateModal();
        }
      }
      // Langkah 8 - 9 (Aksi Kartu & Tutup Drawer)
      else if (stepIndex === 7 || stepIndex === 8) {
        if (typeof window.closeToolkitMenu === 'function') window.closeToolkitMenu();
        if (typeof closeAddTemplateModal === 'function') closeAddTemplateModal();
        this.removeQuickReplySandbox();
        const drawer = document.getElementById('quickreply-drawer');
        if (!drawer?.classList.contains('active') && typeof openQuickReplyDrawer === 'function') {
          openQuickReplyDrawer();
        }
      }
      // Langkah 10 (Uji Coba Ctrl+Space di Sandbox)
      else if (stepIndex === 9) {
        if (typeof closeQuickReplyDrawer === 'function') closeQuickReplyDrawer();
        if (typeof closeAddTemplateModal === 'function') closeAddTemplateModal();
        this.renderQuickReplySandbox();
        const dropdown = document.getElementById('onboarding-sandbox-dropdown');
        if (dropdown) dropdown.style.display = 'none';
      }
      // Langkah 11 (Cari & Kirim di Sandbox)
      else if (stepIndex === 10) {
        if (typeof closeQuickReplyDrawer === 'function') closeQuickReplyDrawer();
        if (typeof closeAddTemplateModal === 'function') closeAddTemplateModal();
        this.renderQuickReplySandbox();
        this.showSandboxDropdown();
      }
    }

    // ── 4. Task: Catatan Pembeli & Warning COD (task_customer_notes) ──
    if (taskId === 'task_customer_notes') {
      // Langkah 1 (Buka FAB)
      if (stepIndex === 0) {
        if (typeof closeCustomerNotesModal === 'function') closeCustomerNotesModal();
        if (typeof closeAddNoteFormModal === 'function') closeAddNoteFormModal();
        if (typeof window.closeToolkitMenu === 'function') window.closeToolkitMenu();
      }
      // Langkah 2 (Pilih di Dial)
      else if (stepIndex === 1) {
        if (typeof closeCustomerNotesModal === 'function') closeCustomerNotesModal();
        if (typeof closeAddNoteFormModal === 'function') closeAddNoteFormModal();
        if (typeof window.toggleToolkitMenu === 'function') window.toggleToolkitMenu(true);
      }
      // Langkah 3 - 5 (Filter, Cari, Tambah di Notes Modal)
      else if (stepIndex >= 2 && stepIndex <= 4) {
        if (typeof window.closeToolkitMenu === 'function') window.closeToolkitMenu();
        if (typeof closeAddNoteFormModal === 'function') closeAddNoteFormModal();
        const notesOverlay = document.getElementById('modal-cnotes-overlay');
        if (!notesOverlay?.classList.contains('active') && typeof openCustomerNotesModal === 'function') {
          openCustomerNotesModal();
        }
      }
      // Langkah 6 - 9 (Form Modal Tambah Catatan)
      else if (stepIndex >= 5 && stepIndex <= 8) {
        if (typeof window.closeToolkitMenu === 'function') window.closeToolkitMenu();
        const formOverlay = document.getElementById('modal-cnote-form-overlay');
        if (!formOverlay?.classList.contains('active') && typeof openAddNoteFormModal === 'function') {
          openAddNoteFormModal();
        }
      }
      // Langkah 10 - 11 (Aksi Kartu & Tutup Modal)
      else if (stepIndex >= 9) {
        if (typeof window.closeToolkitMenu === 'function') window.closeToolkitMenu();
        if (typeof closeAddNoteFormModal === 'function') closeAddNoteFormModal();
        const notesOverlay = document.getElementById('modal-cnotes-overlay');
        if (!notesOverlay?.classList.contains('active') && typeof openCustomerNotesModal === 'function') {
          openCustomerNotesModal();
        }
      }
    }

    // ── 5. Task: Scratchpad Catatan (task_scratchpad) ──
    if (taskId === 'task_scratchpad') {
      // Langkah 1 (Buka FAB)
      if (stepIndex === 0) {
        if (typeof closeScratchpad === 'function') closeScratchpad();
        if (typeof window.closeToolkitMenu === 'function') window.closeToolkitMenu();
      }
      // Langkah 2 (Pilih di Dial)
      else if (stepIndex === 1) {
        if (typeof closeScratchpad === 'function') closeScratchpad();
        if (typeof window.toggleToolkitMenu === 'function') window.toggleToolkitMenu(true);
      }
      // Langkah 3 - 9 (Tulis, Tab, Rename, Resize, Save, Load, Tutup)
      else if (stepIndex >= 2) {
        if (typeof window.closeToolkitMenu === 'function') window.closeToolkitMenu();
        const spWin = document.getElementById('scratchpad-window');
        if ((!spWin || spWin.style.display === 'none') && typeof openScratchpad === 'function') {
          openScratchpad();
        }
      }
    }

    // ── 6. Task: Bersihkan Cache Aman (task_settings_cache) ──
    if (taskId === 'task_settings_cache') {
      // Langkah 1 (Buka Pengaturan)
      if (stepIndex === 0) {
        const settingsOverlay = document.getElementById('settings-overlay');
        if (settingsOverlay?.classList.contains('active') && typeof closeSettings === 'function') {
          closeSettings();
        }
      }
      // Langkah 2 (Pilih Tab Cache & Data)
      else if (stepIndex === 1) {
        const settingsOverlay = document.getElementById('settings-overlay');
        if (!settingsOverlay?.classList.contains('active') && typeof openSettings === 'function') {
          openSettings();
        }
      }
      // Langkah 3 - 7 (Di dalam Tab Cache & Data)
      else if (stepIndex >= 2) {
        const settingsOverlay = document.getElementById('settings-overlay');
        if (!settingsOverlay?.classList.contains('active') && typeof openSettings === 'function') {
          openSettings();
        }
        const cacheTabBtn = document.getElementById('tab-btn-cache');
        if (!cacheTabBtn?.classList.contains('active')) {
          cacheTabBtn?.click();
        }
      }
    }
  },

  goToStep(index) {
    const steps = this.getActiveSteps();
    if (index >= 0 && index < steps.length) {
      this.cleanupCurrentStep();
      this.currentTourStepIndex = index;
      this.renderTourStep();
    }
  },

  renderTourStep() {
    this.cleanupCurrentStep();

    const steps = this.getActiveSteps();
    const step = steps[this.currentTourStepIndex];
    if (!step) {
      this.endTour();
      return;
    }

    // Sinkronisasi otomatis konteks modal / tab / drawer / dialog (maju maupun mundur)
    this.syncStepContext(step, this.currentTourStepIndex, this.currentGuideTaskId);

    const badge = document.getElementById('onboarding-tour-step-badge');
    const title = document.getElementById('onboarding-tour-title');
    const desc = document.getElementById('onboarding-tour-desc');
    const dots = document.getElementById('onboarding-tour-dots');
    const btnPrev = document.getElementById('btn-onboarding-tour-prev');
    const btnNext = document.getElementById('btn-onboarding-tour-next');

    const totalSteps = steps.length;
    const badgePrefix = this.currentTourType === 'task_guide' ? 'Tutorial' : 'Langkah';
    if (badge) badge.textContent = `${badgePrefix} ${this.currentTourStepIndex + 1} dari ${totalSteps}`;
    if (title) title.innerHTML = step.title;
    if (desc) desc.innerHTML = step.desc;

    // Render Dots safely
    if (dots) {
      dots.innerHTML = '';
      steps.forEach((s, idx) => {
        const dot = document.createElement('div');
        dot.className = `onboarding-tour-dot ${idx === this.currentTourStepIndex ? 'active' : ''}`;
        dot.setAttribute('role', 'button');
        dot.setAttribute('tabindex', '0');
        const cleanTitle = (s.title || '').replace(/<[^>]*>/g, '').trim();
        dot.setAttribute('aria-label', `${badgePrefix} ${idx + 1}: ${cleanTitle}`);
        dot.addEventListener('click', () => this.goToStep(idx));
        dot.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.goToStep(idx);
          }
        });
        dots.appendChild(dot);
      });
    }

    // Update Buttons
    if (this.currentTourType === 'task_guide') {
      if (btnPrev) {
        btnPrev.style.display = this.currentTourStepIndex === 0 ? 'none' : 'inline-flex';
      }
      if (btnNext) {
        if (step.allowNextButton) {
          btnNext.style.display = 'inline-flex';
          btnNext.textContent = step.nextButtonLabel || 'Lanjut →';
        } else {
          btnNext.style.display = 'none';
        }
      }
    } else {
      if (btnPrev) {
        btnPrev.style.display = this.currentTourStepIndex === 0 ? 'none' : 'inline-flex';
      }
      if (btnNext) {
        btnNext.style.display = 'inline-flex';
        btnNext.textContent = this.currentTourStepIndex === totalSteps - 1 ? 'Selesai ✓' : 'Lanjut →';
      }
    }

    // Bind real-world action listeners for hands-on tasks
    if (typeof step.bindEvents === 'function') {
      this.currentStepCleanup = step.bindEvents(this);
    }

    // Tampilkan simulasi tab bar jika berada di langkah multi-tab dan belum ada toko yang dibuka
    if (step.id === 'step_tab_bar' && !activeStoreId) {
      this.renderDemoTabBar();
    } else {
      this.restoreTabBarIfNeeded();
    }

    // Buka menu dial cepat CS Toolkit jika berada di langkah pengenalan Tools CS atau langkah yang menargetkan item di dalam menu toolkit
    const isToolkitMenuOpenStep = step.id === 'step_cs_toolkit' || 
                                  step.id === 'qr_step_click_dial' || 
                                  step.id === 'cnote_step_click_dial' || 
                                  step.id === 'sp_step_click_dial' || 
                                  (step.target && step.target.includes('tool-item-'));

    if (isToolkitMenuOpenStep) {
      if (typeof window.toggleToolkitMenu === 'function') {
        window.toggleToolkitMenu(true);
      }
    } else {
      if (typeof window.closeToolkitMenu === 'function') {
        window.closeToolkitMenu();
      }
    }

    this.positionTourPopover(step);

    // Mulai pelacakan dinamis real-time jika elemen bergeser/berubah ukuran (misal saat tab bar memanjang)
    this.startActiveSpotlightTracking(step);
  },

  renderDemoTabBar() {
    const tb = document.getElementById('tab-bar');
    if (!tb) return;
    tb.style.display = 'flex';
    tb.innerHTML = `
      <div class="tab-nav-controls">
        <button class="tab-nav-btn" title="Kembali (Alt+←)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg></button>
        <button class="tab-nav-btn" title="Maju (Alt+→)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>
        <button class="tab-nav-btn" title="Refresh (F5)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
      </div>
      <div class="tab-nav-separator"></div>
      <div class="tab-item active" title="Tab Chat Aktif">
        <div class="tab-favicon-mini" style="background:#f5521d; color:#fff;">SP</div>
        <span class="tab-title">Shopee - Chat CS</span>
      </div>
      <div class="tab-item" title="Tab Pesanan Masuk">
        <div class="tab-favicon-mini" style="background:#f5521d; color:#fff;">SP</div>
        <span class="tab-title">Pesanan Masuk (3)</span>
        <button class="tab-hibernate-btn" title="Tidurkan tab (hemat RAM)">🍃</button>
      </div>
      <div class="tab-item hibernated" title="Tab Produk (Sedang Tidur / Hemat RAM)">
        <div class="tab-favicon-mini" style="background:rgba(16,185,129,0.2); color:#10b981;">🍃</div>
        <span class="tab-title">Daftar Produk</span>
      </div>
      <button class="tab-add-btn" id="btn-add-tab" title="Tambah Tab Baru (+)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      <div style="margin-left: auto; display: flex; align-items: center; gap: 8px; padding-right: 8px;">
        <span style="font-size: 10.5px; font-weight: 600; color: #df1683; background: rgba(223, 22, 131, 0.12); padding: 2px 8px; border-radius: 12px; border: 1px solid rgba(223, 22, 131, 0.25);">🎯 Simulasi Multi-Tab</span>
      </div>
    `;
  },

  restoreTabBarIfNeeded() {
    if (!activeStoreId) {
      const tb = document.getElementById('tab-bar');
      if (tb) {
        tb.style.display = 'none';
        tb.innerHTML = '';
        delete tb.dataset.lastHtml;
      }
    } else if (typeof renderTabBar === 'function') {
      renderTabBar();
    }
  },

  isElementVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  },

  positionTourPopover(step) {
    const popover = document.getElementById('onboarding-tour-popover');
    const maskCutout = document.getElementById('onboarding-mask-cutout');
    const spotlightFrame = document.getElementById('onboarding-spotlight-frame');
    if (!popover || !maskCutout || !spotlightFrame) return;

    // Khusus langkah sandbox uji coba (langkah 9 & 10), tempatkan popover di bagian atas layar agar tidak menutupi kotak sandbox
    if (step.id === 'qr_step_practice_ctrl_space' || step.id === 'qr_step_select_and_send') {
      popover.style.left = '50%';
      popover.style.top = '52px';
      popover.style.transform = 'translateX(-50%)';
      popover.style.width = '500px';

      let targetEl = document.querySelector(step.target);
      if (targetEl && this.isElementVisible(targetEl)) {
        const sRect = targetEl.getBoundingClientRect();
        const pad = 6;
        const x = Math.max(4, sRect.left - pad);
        const y = Math.max(4, sRect.top - pad);
        const width = Math.min(window.innerWidth - 8, sRect.width + (pad * 2));
        const height = Math.min(window.innerHeight - 8, sRect.height + (pad * 2));

        maskCutout.setAttribute('x', x);
        maskCutout.setAttribute('y', y);
        maskCutout.setAttribute('width', width);
        maskCutout.setAttribute('height', height);

        spotlightFrame.style.display = 'block';
        spotlightFrame.style.left = `${x}px`;
        spotlightFrame.style.top = `${y}px`;
        spotlightFrame.style.width = `${width}px`;
        spotlightFrame.style.height = `${height}px`;
      }
      return;
    }

    let rect = null;

    // Pastikan menu CS Toolkit dibuka jika target berada di dalam CS Toolkit
    const isToolkitMenuOpenStep = step.id === 'step_cs_toolkit' || 
                                  step.id === 'qr_step_click_dial' || 
                                  (step.target && step.target.includes('tool-item-'));

    if (isToolkitMenuOpenStep) {
      const container = document.getElementById('cs-toolkit-fab-container');
      const fab = document.getElementById('btn-cs-toolkit-fab');
      if (container) container.classList.add('open');
      if (fab) fab.classList.add('active');
    }

    // Khusus langkah CS Toolkit utama, hitung combined bounding rect dari menu popup dan tombol FAB
    if (step.id === 'step_cs_toolkit') {
      const menu = document.getElementById('cs-toolkit-menu');
      const fab = document.getElementById('btn-cs-toolkit-fab');

      if (menu && fab) {
        const menuRect = menu.getBoundingClientRect();
        const fabRect = fab.getBoundingClientRect();
        rect = {
          left: Math.min(menuRect.left, fabRect.left),
          top: Math.min(menuRect.top, fabRect.top),
          right: Math.max(menuRect.right, fabRect.right),
          bottom: Math.max(menuRect.bottom, fabRect.bottom),
          width: Math.max(menuRect.right, fabRect.right) - Math.min(menuRect.left, fabRect.left),
          height: Math.max(menuRect.bottom, fabRect.bottom) - Math.min(menuRect.top, fabRect.top)
        };
      }
    }

    if (!rect) {
      let targetEl = document.querySelector(step.target);
      if (!this.isElementVisible(targetEl) && step.fallbackTarget) {
        const fbEl = document.querySelector(step.fallbackTarget);
        if (this.isElementVisible(fbEl)) {
          targetEl = fbEl;
        }
      }

      if (!targetEl) {
        // Centered fallback if element is not in DOM
        maskCutout.setAttribute('width', '0');
        maskCutout.setAttribute('height', '0');
        spotlightFrame.style.display = 'none';

        popover.style.top = '50%';
        popover.style.left = '50%';
        popover.style.transform = 'translate(-50%, -50%)';
        return;
      }

      rect = targetEl.getBoundingClientRect();
    }

    const pad = 6;
    const x = Math.max(4, rect.left - pad);
    const y = Math.max(4, rect.top - pad);
    const width = Math.min(window.innerWidth - 8, rect.width + (pad * 2));
    const height = Math.min(window.innerHeight - 8, rect.height + (pad * 2));

    // Update SVG Mask Cutout
    maskCutout.setAttribute('x', x);
    maskCutout.setAttribute('y', y);
    maskCutout.setAttribute('width', width);
    maskCutout.setAttribute('height', height);

    // Update Spotlight Frame
    spotlightFrame.style.display = 'block';
    spotlightFrame.style.left = `${x}px`;
    spotlightFrame.style.top = `${y}px`;
    spotlightFrame.style.width = `${width}px`;
    spotlightFrame.style.height = `${height}px`;

    // Position Popover Smartly
    const popoverWidth = popover.offsetWidth || 360;
    const popoverHeight = popover.offsetHeight || 190;
    const margin = 16;
    const minTop = 46; // Hindari menabrak titlebar (38px)

    let popLeft = x;
    let popTop = y + height + margin;

    if (step.position === 'right') {
      popLeft = x + width + margin;
      popTop = Math.max(minTop, Math.min(y, window.innerHeight - popoverHeight - margin));
    } else if (step.position === 'left') {
      popLeft = x - popoverWidth - margin;
      popTop = Math.max(minTop, Math.min(y + (height / 2) - (popoverHeight / 2), window.innerHeight - popoverHeight - margin));
    } else if (step.position === 'top') {
      popLeft = Math.max(margin, Math.min(x, window.innerWidth - popoverWidth - margin));
      popTop = Math.max(minTop, y - popoverHeight - margin);
    } else if (step.position === 'bottom') {
      popLeft = Math.max(margin, Math.min(x + (width / 2) - (popoverWidth / 2), window.innerWidth - popoverWidth - margin));
      popTop = Math.max(minTop, y + height + margin);
    }

    // Clamp inside viewport
    if (popLeft + popoverWidth > window.innerWidth - margin) {
      popLeft = window.innerWidth - popoverWidth - margin;
    }
    if (popLeft < margin) popLeft = margin;

    if (popTop + popoverHeight > window.innerHeight - margin) {
      // Place above target if bottom overflows
      popTop = Math.max(minTop, y - popoverHeight - margin);
    }
    if (popTop < minTop) popTop = minTop;

    popover.style.left = `${popLeft}px`;
    popover.style.top = `${popTop}px`;
    popover.style.transform = 'none';
  },

  nextTourStep() {
    const steps = this.getActiveSteps();
    const curStep = steps[this.currentTourStepIndex];
    if (curStep && typeof curStep.onNext === 'function') {
      curStep.onNext();
    }

    if (this.currentTourStepIndex < steps.length - 1) {
      this.currentTourStepIndex++;
      const nextStep = steps[this.currentTourStepIndex];
      if (nextStep && typeof nextStep.onEnter === 'function') {
        nextStep.onEnter();
      }
      this.renderTourStep();
    } else {
      this.endTour(true);
      if (typeof showToast === 'function') {
        showToast(this.currentTourType === 'task_guide' ? '🎉 Panduan selesai! Silakan simpan toko Anda.' : '🎉 Tur selesai! Anda siap mencoba tugas di checklist.', 'success');
      }
    }
  },

  prevTourStep() {
    const steps = this.getActiveSteps();
    if (this.currentTourStepIndex > 0) {
      const curStep = steps[this.currentTourStepIndex];
      if (curStep && typeof curStep.onLeave === 'function') {
        curStep.onLeave();
      }
      this.currentTourStepIndex--;
      const prevStep = steps[this.currentTourStepIndex];
      if (prevStep && typeof prevStep.onEnter === 'function') {
        prevStep.onEnter();
      }
      this.renderTourStep();
    }
  },

  endTour(isCompleted = false) {
    this.cleanupCurrentStep();
    this.isTourActive = false;
    this.restoreTabBarIfNeeded();
    if (typeof window.closeToolkitMenu === 'function') {
      window.closeToolkitMenu();
    }
    const overlay = document.getElementById('onboarding-tour-overlay');
    if (overlay) {
      overlay.classList.remove('active', 'task-guide-mode');
    }
    if (this.currentTourType === 'main') {
      const state = this.getState();
      if (isCompleted) {
        if (!state.completedTours.includes('main_tour_' + ONBOARDING_CONFIG.version)) {
          state.completedTours.push('main_tour_' + ONBOARDING_CONFIG.version);
          this.saveState(state);
        }
        if (window.AppTelemetry) {
          window.AppTelemetry.track('onboarding_completed');
        }
      } else {
        if (window.AppTelemetry) {
          window.AppTelemetry.track('onboarding_skipped');
        }
      }
    }
    this.currentTourType = 'main';
    this.currentGuideTaskId = null;
  },

  // ── Hands-on Interactive Checklist Tasks ──────────────────────────────────
  renderChecklistWidget() {
    this.injectElements();
    const widget = document.getElementById('onboarding-checklist-widget');
    if (!widget) return;

    const state = this.getState();
    if (state.checklistDismissed) {
      widget.classList.add('hidden');
      return;
    }
    widget.classList.remove('hidden');

    if (state.checklistCollapsed) {
      widget.classList.add('collapsed');
    } else {
      widget.classList.remove('collapsed');
    }

    const tasks = ONBOARDING_CONFIG.checklistTasks;
    const completedCount = tasks.filter(t => state.completedTasks.includes(t.id)).length;
    const totalCount = tasks.length;
    const percent = Math.round((completedCount / totalCount) * 100);
    const isAllDone = completedCount === totalCount;

    widget.innerHTML = `
      <div class="onboarding-checklist-header" onclick="OnboardingManager.toggleChecklistCollapse()">
        <div class="onboarding-checklist-header-left">
          <div class="onboarding-checklist-badge-icon" id="onboarding-secret-badge-reset" onclick="event.stopPropagation(); OnboardingManager.handleSecretBadgeClick(event);" title="Alt+Klik atau Klik 3x untuk Reset Checklist">${isAllDone ? '🎉' : '📋'}</div>
          <div class="onboarding-checklist-header-titles">
            <span class="onboarding-checklist-title" onclick="if(event.altKey){ event.stopPropagation(); OnboardingManager.resetChecklistTasks(); }">Checklist Onboarding CS</span>
            <span class="onboarding-checklist-subtitle">${completedCount}/${totalCount} Selesai (${percent}%)</span>
          </div>
        </div>
        <div class="onboarding-checklist-header-controls">
          <button class="onboarding-checklist-btn-ctrl" title="${state.checklistCollapsed ? 'Perluas' : 'Kecilkan'}" onclick="event.stopPropagation(); OnboardingManager.toggleChecklistCollapse();">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="${state.checklistCollapsed ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}"/></svg>
          </button>
        </div>
      </div>

      <div class="onboarding-checklist-progress-bar-bg">
        <div class="onboarding-checklist-progress-bar-fill" style="width: ${percent}%;"></div>
      </div>

      <div class="onboarding-checklist-body">
        ${isAllDone ? `
          <div class="onboarding-checklist-celebration">
            <div class="onboarding-checklist-celebration-badge">🏆</div>
            <h4>Luar Biasa! Semua Tugas Selesai</h4>
            <p>Anda telah menguasai seluruh fitur utama CS Marketplace Dashboard dan siap melayani pembeli dengan maksimal.</p>
            <button class="btn-secondary" style="font-size: 11px; padding: 4px 10px; margin-top: 4px;" onclick="OnboardingManager.resetChecklistTasks()">
              🔄 Ulangi Checklist Dari Awal
            </button>
          </div>
        ` : tasks.map(task => {
          const isDone = state.completedTasks.includes(task.id);
          return `
            <div class="onboarding-task-item ${isDone ? 'completed' : ''}">
              <div class="onboarding-task-item-left">
                <div class="onboarding-task-checkbox">
                  ${isDone ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                </div>
                <div class="onboarding-task-info">
                  <span class="onboarding-task-title">${task.title}</span>
                  <span class="onboarding-task-desc">${task.desc}</span>
                </div>
              </div>
              ${!isDone ? `
                <button class="onboarding-task-action-btn" onclick="OnboardingManager.executeTaskAction('${task.id}')">
                  ${task.btnLabel} ↗
                </button>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <div class="onboarding-checklist-footer">
        <div style="display: flex; gap: 4px; align-items: center;">
          <button class="btn-icon-text" style="padding: 2px 6px; font-size: 11px; color: var(--text-secondary);" onclick="OnboardingManager.startTour()">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Tur Ulang
          </button>
          <button class="btn-icon-text" style="padding: 2px 6px; font-size: 11px; color: var(--text-muted); opacity: 0.7;" title="Tombol Rahasia: Reset Checklist Tugas" onclick="OnboardingManager.resetChecklistTasks()">
            🔄 Reset
          </button>
        </div>
        <button class="onboarding-checklist-btn-dismiss" onclick="OnboardingManager.dismissChecklist()">
          Sembunyikan
        </button>
      </div>
    `;
  },

  handleSecretBadgeClick(e) {
    if (e.altKey || e.shiftKey) {
      this.resetChecklistTasks();
      return;
    }

    this.secretClickCount = (this.secretClickCount || 0) + 1;
    if (this.secretClickTimer) clearTimeout(this.secretClickTimer);

    this.secretClickTimer = setTimeout(() => {
      this.secretClickCount = 0;
    }, 1200);

    if (this.secretClickCount >= 3) {
      this.secretClickCount = 0;
      this.resetChecklistTasks();
    } else {
      this.toggleChecklistCollapse();
    }
  },

  resetChecklistTasks(showToastMsg = true) {
    const state = this.getState();
    state.completedTasks = [];
    state.checklistDismissed = false;
    state.checklistCollapsed = false;
    this.saveState(state);
    this.renderChecklistWidget();

    if (showToastMsg && typeof showToast === 'function') {
      showToast('🔄 Checklist onboarding berhasil di-reset ke awal (0%)!', 'success');
    }
  },

  toggleChecklistCollapse() {
    const state = this.getState();
    state.checklistCollapsed = !state.checklistCollapsed;
    this.saveState(state);
    this.renderChecklistWidget();

    // Jika checklist diperluas (expanded), tutup menu speed dial Tools CS agar tidak tumpang tindih
    if (!state.checklistCollapsed && typeof closeToolkitMenu === 'function') {
      closeToolkitMenu();
    }
  },

  dismissChecklist() {
    const state = this.getState();
    state.checklistDismissed = true;
    this.saveState(state);
    this.renderChecklistWidget();
    if (typeof showToast === 'function') {
      showToast('Checklist disembunyikan. Anda dapat membukanya kembali dari menu Pengaturan.', '');
    }
  },

  reopenChecklist() {
    this.injectElements();
    const state = this.getState();
    state.checklistDismissed = false;
    state.checklistCollapsed = false;
    this.saveState(state);
    this.renderChecklistWidget();
    const widget = document.getElementById('onboarding-checklist-widget');
    if (widget) {
      widget.classList.remove('hidden', 'collapsed');
      widget.style.display = 'flex';
    }
    if (typeof showToast === 'function') {
      showToast('📋 Checklist Onboarding CS dibuka.', 'info');
    }
  },

  // ── Action Notifications Triggered from Entire App ─────────────────────────
  notifyAction(actionKey) {
    const state = this.getState();
    const matchedTask = ONBOARDING_CONFIG.checklistTasks.find(t => t.actionKey === actionKey);
    if (!matchedTask) return;

    if (!state.completedTasks.includes(matchedTask.id)) {
      state.completedTasks.push(matchedTask.id);
      this.saveState(state);
      this.renderChecklistWidget();

      if (window.AppTelemetry) {
        window.AppTelemetry.track('checklist_task_completed');
      }

      // Dismiss task guide if this was the guide running
      if (this.isTourActive && this.currentTourType === 'task_guide') {
        if (this.currentGuideTaskId === 'task_open_tab' && this.currentTourStepIndex < 2) {
          // Biarkan task_open_tab tetap aktif hingga langkah 3 (tips Ctrl+Klik)
        } else if (this.currentGuideTaskId === 'task_quick_reply' && this.currentTourStepIndex < 10) {
          // Biarkan task_quick_reply tetap aktif hingga langkah 11 (pilih template di sandbox)
        } else if (this.currentGuideTaskId === 'task_customer_notes' && this.currentTourStepIndex < 10) {
          // Biarkan task_customer_notes tetap aktif hingga langkah 11 (tutup modal catatan)
        } else if (this.currentGuideTaskId === 'task_scratchpad' && this.currentTourStepIndex < 8) {
          // Biarkan task_scratchpad tetap aktif hingga langkah 9 (tutup scratchpad)
        } else if (this.currentGuideTaskId === 'task_settings_cache' && this.currentTourStepIndex < 6) {
          // Biarkan task_settings_cache tetap aktif hingga langkah 7 (tutup pengaturan)
        } else if (this.currentGuideTaskId === 'task_whatsapp_linker' && this.currentTourStepIndex < 3) {
          // Biarkan task_whatsapp_linker tetap aktif hingga langkah 4 (tutup WA Linker)
        } else if (this.currentGuideTaskId === 'task_network_sop' && this.currentTourStepIndex < 1) {
          // Biarkan task_network_sop tetap aktif hingga langkah 2 (buka SOP)
        } else {
          this.endTour();
        }
      }

      // Trigger Celebration Toast
      if (typeof showToast === 'function') {
        const total = ONBOARDING_CONFIG.checklistTasks.length;
        const current = state.completedTasks.length;
        if (current === total) {
          showToast('🎉 Selamat! Semua tugas onboarding telah selesai (100%)!', 'success');
        } else {
          showToast(`✓ Tugas Onboarding Selesai: ${matchedTask.title} (${current}/${total})`, 'success');
        }
      }
    }
  },

  // ── Direct Launcher for Task Buttons ───────────────────────────────────────
  executeTaskAction(taskId) {
    switch (taskId) {
      case 'task_add_store':
        this.startTaskGuide('task_add_store');
        break;
      case 'task_open_tab':
        this.startTaskGuide('task_open_tab');
        break;
      case 'task_quick_reply':
        this.startTaskGuide('task_quick_reply');
        break;
      case 'task_whatsapp_linker':
        this.startTaskGuide('task_whatsapp_linker');
        break;
      case 'task_scratchpad':
        this.startTaskGuide('task_scratchpad');
        break;
      case 'task_customer_notes':
        this.startTaskGuide('task_customer_notes');
        break;
      case 'task_network_sop':
        this.startTaskGuide('task_network_sop');
        break;
      case 'task_settings_cache':
        this.startTaskGuide('task_settings_cache');
        break;
      default:
        break;
    }
  },

  // ── Reset Helper for Testing / User Request ────────────────────────────────
  resetOnboarding() {
    const defaultState = {
      seenVersion: null,
      completedTours: [],
      completedTasks: [],
      checklistDismissed: false,
      checklistCollapsed: false
    };
    this.saveState(defaultState);
    this.renderChecklistWidget();
    this.showWelcomeModal(true);
  }
};

// Expose OnboardingManager to Window
window.OnboardingManager = OnboardingManager;
window.startOnboardingTour = () => OnboardingManager.startTour();
window.startTaskGuide = (taskId) => OnboardingManager.startTaskGuide(taskId);
window.reopenOnboardingChecklist = () => OnboardingManager.reopenChecklist();
window.resetOnboardingChecklist = () => OnboardingManager.resetChecklistTasks();
window.showOnboardingWelcome = () => OnboardingManager.showWelcomeModal(true);
window.resetAllOnboarding = () => OnboardingManager.resetOnboarding();
