import React, { useState, useRef, useEffect } from 'react';
import { X, Image } from 'lucide-react';
import { loadQrScript } from '../../utils/helpers';

const ScannerModal = ({ onClose, onScan }) => {
    const [isScanning, setIsScanning] = useState(true);
    const scannerRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        let html5QrCode;

        loadQrScript().then(() => {
            // Use Html5Qrcode class for more control
            html5QrCode = new window.Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    onScan(decodedText);
                    onClose();
                },
                (errorMessage) => {
                    // ignore errors for better UX
                }
            ).catch(err => {
                console.error("Error starting scanner", err);
                setIsScanning(false);
            });
        });

        return () => {
            if (scannerRef.current) {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().then(() => {
                        scannerRef.current.clear();
                    }).catch(err => console.error("Failed to stop scanner", err));
                } else {
                    scannerRef.current.clear();
                }
            }
        };
    }, []);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (scannerRef.current) {
            const scanFile = () => {
                scannerRef.current.scanFile(file, true)
                    .then(decodedText => {
                        onScan(decodedText);
                        onClose();
                    })
                    .catch(err => {
                        console.error("Error scanning file", err);
                        alert("Impossible de lire le QR code de cette image. Essayez une autre image.");
                        // Restart camera
                        setIsScanning(true);
                        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
                        scannerRef.current.start({ facingMode: "environment" }, config, (text) => { onScan(text); onClose(); });
                    });
            };

            if (isScanning) {
                scannerRef.current.stop().then(() => {
                    setIsScanning(false);
                    scanFile();
                }).catch(err => {
                    console.error("Failed to stop scanner for file upload", err);
                    scanFile();
                });
            } else {
                scanFile();
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-4 w-full max-w-md relative overflow-hidden">
                <button onClick={onClose} className="absolute right-4 top-4 z-20 bg-white/80 backdrop-blur rounded-full p-2 shadow-lg hover:bg-white transition-colors"><X size={20} /></button>

                <h3 className="text-center font-bold mb-6 text-lg">Scanner un produit</h3>

                <div className="relative rounded-xl overflow-hidden bg-black aspect-square mb-6 shadow-inner">
                    <div id="reader" className="w-full h-full"></div>

                    {/* Scanning Overlay */}
                    {isScanning && (
                        <div className="absolute inset-0 pointer-events-none z-10">
                            <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-xl"></div>
                            {/* Corner Markers */}
                            <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg"></div>
                            <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg"></div>
                            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg"></div>
                            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-lg"></div>

                            {/* Animated Scan Line */}
                            <div className="absolute left-4 right-4 h-0.5 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-scan"></div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    <p className="text-center text-sm text-slate-500">Placez le QR Code dans le cadre</p>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-slate-400">Ou importer</span>
                        </div>
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={handleFileUpload}
                    />

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                    >
                        <Image size={20} />
                        Choisir une image (PNG/JPG)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScannerModal;
