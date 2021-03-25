import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productAlreadyInCart = cart.find(product => product.id === productId);

      if (!productAlreadyInCart) {
        const { data: product } = await api.get<Product>(`products/${productId}`);
        const { data: stock } = await api.get<Stock>(`stock/${productId}`);

        if (stock.amount > 0) {
          setCart([...cart, {... product, amount: 1}]);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, {... product, amount: 1}]));
          toast('Adicionado');
          return;
        }
      }

      if (productAlreadyInCart) {
        const { data: stock } = await api.get<Stock>(`stock/${productId}`);

        if (stock.amount > productAlreadyInCart.amount) {
          const updatedAmountCart = cart.map(item => {
            const addAmountItem = {
              ...item,
              amount: Number(item.amount) + 1
            };

            if (item.id === productId) {
              return addAmountItem;
            }
            else {
              return item; 
            }
          });
          
          setCart(updatedAmountCart); 
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedAmountCart)); 
          toast('Adicionado');
          return;
        }
        else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExist = cart.some(cartProduct => cartProduct.id === productId);
      if (!productExist) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const removeCartItem = cart.filter(item => item.id !== productId);
      setCart(removeCartItem);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(removeCartItem)); 
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        toast.error('Erro na alteração de quantidade do produto')
        return;
      }
      
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);
      const productAmount = stock.amount;
      const stockIsNotAvailable = amount > productAmount;

      if (stockIsNotAvailable) {
         toast.error('Quantidade solicitada fora de estoque');
         return;
      }

      const productExist = cart.some(cartProduct => cartProduct.id === productId);
      if (!productExist) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      const updateCartItem = cart.map(item  => {
        const addCartItem = {
          ...item,
          amount: amount
        };

        if (item.id === productId) {
          return addCartItem;
        }
        else {
          return item;
        }
      });

      setCart(updateCartItem);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCartItem)); 
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
