import React, { useState } from 'react';
import axios from 'axios';

// --- Interfaces (mises à jour avec plus de champs de l'API) ---
interface FormData {
  departure: string;
  arrival: string;
  flightNumber: string;
  date: string;
}

interface Seat {
  IsAvailable: boolean;
  IsAvailableForInfant: boolean;
  Price: number;
  PriceWithCreditCardFee: number;
  SeatAccess: string;
  SeatNumber: string;
  PriceBand: string; // Contient le nom comme "Extra legroom", "Up Front", etc.
  PriceBandId: number;
}

interface Block {
  Seats: Seat[];
}

interface Row {
  RowNumber: number;
  IsOverWing: boolean;
  PriceBandName: string; // Nom de la zone pour la rangée (peut différer de Seat.PriceBand parfois)
  Blocks: Block[];
}

interface SeatPlan {
  AircraftType: string;
  Rows: Row[];
  CurrencyCode: string; // Est au niveau racine
  RestrictedSsrCodes?: string[];
}

// --- Composant Seat ---
interface SeatProps {
  seat: Seat;
  currencyCode: string; // Passé séparément
  onClick?: (seatNumber: string) => void;
}

const SeatComponent: React.FC<SeatProps> = ({ seat, currencyCode, onClick }) => {
  const seatLetter = seat.SeatNumber.slice(-1);
  const isAvailable = seat.IsAvailable;
  const baseStyle = "w-10 h-10 flex items-center justify-center border rounded text-xs font-semibold cursor-pointer transition-colors duration-150 ease-in-out";
  const availableStyle = "bg-green-200 border-green-400 hover:bg-green-300 text-green-800";
  const unavailableStyle = "bg-red-200 border-red-400 text-red-800 cursor-not-allowed";
  // const restrictedStyle = "bg-yellow-200 border-yellow-400 text-yellow-800"; // Commenté car non utilisé

  let style = isAvailable ? availableStyle : unavailableStyle;

  // Optionnel: Style différent pour les sièges avec accès restreint
  // if (isAvailable && seat.SeatAccess === 'Restricted') {
  //   style = restrictedStyle; // Décommentez cette ligne si vous décommentez la déclaration de restrictedStyle
  // }

  const handleClick = () => {
    if (isAvailable && onClick) {
      onClick(seat.SeatNumber);
    }
  };

  // Correction : Utilisation de `currencyCode` (prop) et `seat.PriceBand`
  const tooltipText = `Siège ${seat.SeatNumber}\n${
    isAvailable
      ? `Prix: ${seat.Price} ${currencyCode}\nType: ${seat.PriceBand || 'Standard'}${seat.SeatAccess === 'Restricted' ? ' (Accès restreint)' : ''}`
      : 'Non disponible'
  }`;

  return (
    <div
      key={seat.SeatNumber}
      className={`${baseStyle} ${style}`}
      title={tooltipText}
      onClick={handleClick}
    >
      {seatLetter}
    </div>
  );
};


// --- Composant Principal ---
export default function SeatPlanViewer() {
  const [formData, setFormData] = useState<FormData>({
    departure: '',
    arrival: '',
    flightNumber: '',
    date: '',
  });
  const [seatPlan, setSeatPlan] = useState<SeatPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const fetchSeatPlan = async () => {
    setIsLoading(true);
    setError(null);
    setSeatPlan(null);
    const { departure, arrival, flightNumber, date } = formData;

    if (!departure || !arrival || !flightNumber || !date) {
        setError("Veuillez remplir tous les champs.");
        setIsLoading(false);
        return;
    }

    const url = `/ejavailability/api/v92/seating/getseatplan?ArrivalIata=${arrival}&CurrencyCode=EUR&DepartureDate=${date}&DepartureIata=${departure}&FareCode=Y&FareType=0&FlightInternalId=aaa&FlightNumber=${flightNumber}&LanguageCode=FR`;

    try {
      const res = await axios.get<SeatPlan>(url);
      // Pas besoin de modifier les données ici, CurrencyCode est déjà à la racine
      setSeatPlan(res.data);
    } catch (err) {
      console.error('Erreur lors de la récupération du plan de sièges:', err);
      if (axios.isAxiosError(err)) {
          setError(`Erreur API: ${err.response?.statusText || err.message}`);
      } else {
          setError("Une erreur inconnue est survenue.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderColumnHeaders = () => {
     // ... (pas de changement dans cette fonction) ...
    if (!seatPlan || !seatPlan.Rows.length || !seatPlan.Rows[0].Blocks.length) {
      return null;
    }
    const firstRow = seatPlan.Rows[0];
    // Gère le cas où il n'y a qu'un seul bloc
    const lettersBlock1 = firstRow.Blocks[0].Seats.map(s => s.SeatNumber.slice(-1));
    const lettersBlock2 = firstRow.Blocks.length > 1 ? firstRow.Blocks[1].Seats.map(s => s.SeatNumber.slice(-1)) : [];


    return (
      <div className="flex items-center mb-1 pl-12"> {/* Ajustement padding pour aligner avec RowNumber */}
        {/* Lettres Bloc 1 */}
        <div className="flex space-x-1">
          {lettersBlock1.map(letter => (
            <div key={`header-${letter}`} className="w-10 h-6 flex items-center justify-center text-sm font-medium text-gray-500">
              {letter}
            </div>
          ))}
        </div>
        {/* Allée */}
        {lettersBlock2.length > 0 && <div className="w-8 flex-shrink-0"></div>}
        {/* Lettres Bloc 2 */}
        {lettersBlock2.length > 0 && (
           <div className="flex space-x-1">
            {lettersBlock2.map(letter => (
                <div key={`header-${letter}`} className="w-10 h-6 flex items-center justify-center text-sm font-medium text-gray-500">
                {letter}
                </div>
            ))}
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-4 text-center text-gray-700">Visualiseur de Plan de Sièges</h1>
      <div className="bg-white shadow-md rounded px-4 pt-6 pb-8 mb-4">
        {/* ... Formulaire (pas de changement) ... */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            name="departure"
            placeholder="Départ (ex: TLS)"
            value={formData.departure}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            name="arrival"
            placeholder="Arrivée (ex: ORY)"
            value={formData.arrival}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            name="flightNumber"
            placeholder="Numéro de vol (ex: 1234)"
            value={formData.flightNumber}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center justify-center">
          <button
            onClick={fetchSeatPlan}
            disabled={isLoading}
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline transition-colors duration-150 ease-in-out ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Recherche...' : 'Rechercher'}
          </button>
        </div>
      </div>

      {error && (
         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Erreur!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {seatPlan && (
        <div className="mt-6 bg-gray-50 p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-4 text-center text-gray-800">
             Plan des sièges - Vol {formData.flightNumber} ({seatPlan.AircraftType})
          </h2>

          <div className="flex justify-center space-x-4 mb-4 text-sm">
             {/* ... Légende (pas de changement) ... */}
             <div className="flex items-center space-x-1">
                <div className="w-4 h-4 bg-green-200 border border-green-400 rounded"></div>
                <span>Disponible</span>
            </div>
             <div className="flex items-center space-x-1">
                <div className="w-4 h-4 bg-red-200 border border-red-400 rounded"></div>
                <span>Non disponible</span>
            </div>
          </div>

          <div className="overflow-x-auto">
             <div className="inline-block min-w-full py-2 align-middle">
                {renderColumnHeaders()}

                <div className="space-y-1">
                {seatPlan.Rows.map((row) => (
                    <div key={row.RowNumber} className="flex items-center">
                      <span className="w-10 text-center font-bold text-gray-600 mr-2">{row.RowNumber}</span>

                      {/* Bloc 1 */}
                      <div className="flex space-x-1">
                          {row.Blocks[0].Seats.map((seat) => (
                              // Correction: Passer seat et currencyCode séparément
                              <SeatComponent
                                key={seat.SeatNumber}
                                seat={seat}
                                currencyCode={seatPlan.CurrencyCode}
                              />
                          ))}
                      </div>

                      {/* Allée */}
                      {row.Blocks.length > 1 && (
                          <div className="w-8 flex-shrink-0" aria-hidden="true"></div>
                      )}

                      {/* Bloc 2 */}
                      {row.Blocks.length > 1 && (
                          <div className="flex space-x-1">
                          {row.Blocks[1].Seats.map((seat) => (
                             // Correction: Passer seat et currencyCode séparément
                             <SeatComponent
                                key={seat.SeatNumber}
                                seat={seat}
                                currencyCode={seatPlan.CurrencyCode}
                              />
                          ))}
                          </div>
                      )}
                       <span className="w-10 text-center font-bold text-gray-600 ml-2">{row.RowNumber}</span>
                    </div>
                ))}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
