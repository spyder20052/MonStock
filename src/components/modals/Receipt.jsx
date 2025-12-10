import React from 'react';
import { X, Printer } from 'lucide-react';
import Button from '../ui/Button';
import { formatDate, formatMoney } from '../../utils/helpers';

const Receipt = ({ sale, onClose }) => {
    const printReceipt = () => {
        const printContent = document.getElementById('receipt-print-area').innerHTML;
        const originalContent = document.body.innerHTML;

        // Simple print trick
        document.body.innerHTML = printContent;
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload(); // Reload to restore event listeners
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold">Ticket #{sale.id.slice(-6)}</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>

                <div className="overflow-y-auto p-6 bg-white" id="receipt-print-area">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-widest">StockPro</h2>
                        <p className="text-slate-500 text-xs mt-1">Commerce Général</p>
                        <p className="text-slate-400 text-xs">--------------------------------</p>
                    </div>

                    <div className="mb-4 text-sm text-slate-600">
                        <p>Date: {formatDate(sale.date)}</p>
                        <p>ID Vente: {sale.id}</p>
                        {sale.customerName && sale.customerName !== 'Anonyme' && (
                            <p className="font-medium text-indigo-700">Client: {sale.customerName}</p>
                        )}
                    </div>

                    <table className="w-full text-sm mb-6">
                        <thead className="border-b border-dashed border-slate-300">
                            <tr className="text-left">
                                <th className="py-2">Art.</th>
                                <th className="text-center">Qté</th>
                                <th className="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dashed divide-slate-100">
                            {sale.items.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="py-2">{item.name}</td>
                                    <td className="py-2 text-center">x{item.qty}</td>
                                    <td className="py-2 text-right">{formatMoney(item.price * item.qty)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="border-t-2 border-slate-800 pt-4 mb-8">
                        <div className="flex justify-between font-bold text-xl">
                            <span>TOTAL</span>
                            <span>{formatMoney(sale.total)}</span>
                        </div>
                        <div className="text-center mt-6">
                            <p className="text-xs text-slate-400">Merci de votre visite !</p>
                            <div className="flex justify-center mt-2">
                                {/* QR Code du ticket pour vérification future */}
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${sale.id}`} alt="Receipt QR" className="w-16 h-16 opacity-80" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-slate-50 flex gap-2">
                    <Button variant="secondary" className="flex-1" onClick={onClose}>Fermer</Button>
                    <Button className="flex-1" onClick={printReceipt}><Printer size={16} /> Imprimer</Button>
                </div>
            </div>
        </div>
    );
};

export default Receipt;
