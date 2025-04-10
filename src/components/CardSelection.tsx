import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CardSelectionProps {
  cards: string[];
  onSelect: (card: string) => void;
  reason: string;
}

export default function CardSelection({
  cards,
  onSelect,
  reason
}: CardSelectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{reason}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {cards.map((card) => (
            <Button
              key={card}
              onClick={() => onSelect(card)}
              variant="outline"
              className="h-24"
            >
              {card}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 