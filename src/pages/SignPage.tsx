import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { generateClient } from 'aws-amplify/api';
import QRCode from 'qrcode';

const client = generateClient();

const getCat = `
  query GetCat($id: ID!) {
    getCat(id: $id) {
      id
      name
      owner
      votes
    }
  }
`;

const listCats = `
  query ListCats {
    listCats {
      items {
        id
        name
        owner
        votes
      }
    }
  }
`;

function SignPage(): JSX.Element {
  const { catId } = useParams<{ catId: string }>();
  const [cat, setCat] = useState<any>(null);
  const [cats, setCats] = useState<any[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const fetchCat = useCallback(async () => {
    try {
      const [catResult, catsResult] = await Promise.all([
        client.graphql({
          query: getCat,
          variables: { id: catId }
        }),
        client.graphql({ query: listCats })
      ]);
      
      setCat(catResult.data.getCat);
      setCats(catsResult.data.listCats.items.sort((a, b) => b.votes - a.votes));
      
      // Generate QR code for voting
      const voteUrl = `${import.meta.env.VITE_VOTING_API_ENDPOINT || 'https://s2fhl5bike.execute-api.us-west-2.amazonaws.com/prod/'}vote/${catId}`;
      const qrUrl = await QRCode.toDataURL(voteUrl, {
        width: 300,        // Larger size for better scanning
        margin: 4,         // More margin for print safety
        errorCorrectionLevel: 'H',  // High error correction for damaged prints
        color: {
          dark: '#000000',  // Black QR code
          light: '#FFFFFF'  // White background
        }
      });
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error('Error fetching cat:', error);
    }
  }, [catId]);

  useEffect(() => {
    fetchCat();
  }, [fetchCat]);

  if (!cat) {
    return <div>Loading...</div>;
  }

  return (
    <div className="sign-page">
      <div className="sign-container">
        <div className="sign-header">
          <h1 className="competition-title">🐈‍⬛ People's Choice Competition 🐈‍⬛</h1>
          <div className="cage-info">
            <h2 className="cage-number">Cage {cat.cageNumber || (cats.findIndex(c => c.id === cat.id) + 1)}</h2>
          </div>
        </div>
        
        <div className="qr-code-section">
          <div className="qr-code-container">
            {qrCodeUrl && <img src={qrCodeUrl} alt="Vote QR Code" className="qr-code-image" />}
          </div>
          <div className="scan-instructions">
            <h3 className="scan-title">📱 Scan to Vote!</h3>
            <p className="scan-description">
              Use your phone camera or QR code scanner to vote for this cat in the People's Choice contest!
            </p>
          </div>
        </div>
        
        <div className="sign-footer">
          <p className="footer-text">4H Cat Show • People's Choice Award</p>
          <p className="voting-info">Voting is open to all visitors</p>
        </div>
      </div>
    </div>
  );
}

export default SignPage;