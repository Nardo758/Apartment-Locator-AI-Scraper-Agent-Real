import asyncio
from rental_data_agent import RentalDataAgent

async def test():
    async with RentalDataAgent() as agent:
        # Test the fixed navigate_to_pricing_page method
        result = await agent.navigate_to_pricing_page('https://bellmorningside.com')
        print(f'Navigate to pricing page result: {result}')

if __name__ == "__main__":
    asyncio.run(test())