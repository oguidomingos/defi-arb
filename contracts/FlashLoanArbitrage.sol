// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IUniswapV2Router.sol";
import "./uniswap/v3/ISwapRouter.sol";

using SafeERC20 for IERC20;

/**
 * @title FlashLoanArbitrage
 * @dev Contrato para execução de arbitragem usando flash loans
 * Baseado no repositório poly-flash
 */
contract FlashLoanArbitrage is ReentrancyGuard, Ownable {
    
    // Aave V3 Pool
    address public constant AAVE_POOL = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;
    
    // Tokens principais na Polygon
    address public constant WMATIC = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
    address public constant USDC = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    address public constant WETH = 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619;
    
    // DEXs
    address public constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address public constant SUSHISWAP_ROUTER = 0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506;
    address public constant QUICKSWAP_ROUTER = 0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff;
    
    // Eventos
    event FlashLoanExecuted(
        address indexed asset,
        uint256 amount,
        uint256 premium,
        address indexed initiator
    );
    
    event ArbitrageExecuted(
        address indexed tokenA,
        address indexed tokenB,
        uint256 profit,
        string route
    );
    
    event ProfitWithdrawn(
        address indexed token,
        uint256 amount,
        address indexed recipient
    );
    
    // Estrutura para dados de arbitragem
    struct ArbitrageData {
        address tokenA;
        address tokenB;
        uint256 amount;
        string route; // "uniswap->sushiswap" ou "quickswap->uniswap"
    }
    
    // Mapeamento de saldos de lucro
    mapping(address => uint256) public profits;
    
    constructor() {
        // Aprovar tokens principais para os routers
        _approveTokens();
    }
    
    /**
     * @dev Executa flash loan simples
     * @param receiver Endereço que receberá o flash loan
     * @param asset Token para o flash loan
     * @param amount Quantidade do flash loan
     * @param data Dados adicionais (codificados)
     * @param referralCode Código de referência (0 para nenhum)
     */
    function flashLoanSimple(
        address receiver,
        address asset,
        uint256 amount,
        bytes memory data,
        uint16 referralCode
    ) public nonReentrant {
        require(receiver != address(0), "Invalid receiver");
        require(asset != address(0), "Invalid asset");
        require(amount > 0, "Invalid amount");
        
        // Chamar Aave Pool para flash loan
        (bool success, bytes memory result) = AAVE_POOL.call(
            abi.encodeWithSignature(
                "flashLoanSimple(address,address,uint256,bytes,uint16)",
                receiver,
                asset,
                amount,
                data,
                referralCode
            )
        );
        
        require(success, "Flash loan failed");
        
        emit FlashLoanExecuted(asset, amount, 0, msg.sender);
    }
    
    /**
     * @dev Executa flash loan múltiplo
     * @param receiver Endereço que receberá o flash loan
     * @param assets Array de tokens
     * @param amounts Array de quantidades
     * @param interestRateModes Array de modos de taxa de juros
     * @param onBehalfOf Endereço em nome do qual executar
     * @param data Dados adicionais
     * @param referralCode Código de referência
     */
    function flashLoan(
        address receiver,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata interestRateModes,
        address onBehalfOf,
        bytes memory data, // Alterado de calldata para memory
        uint16 referralCode
    ) public nonReentrant {
        require(receiver != address(0), "Invalid receiver");
        require(assets.length == amounts.length, "Arrays length mismatch");
        require(assets.length == interestRateModes.length, "Arrays length mismatch");
        
        // Chamar Aave Pool para flash loan múltiplo
        (bool success, bytes memory result) = AAVE_POOL.call(
            abi.encodeWithSignature(
                "flashLoan(address,address[],uint256[],uint256[],address,bytes,uint16)",
                receiver,
                assets,
                amounts,
                interestRateModes,
                onBehalfOf,
                data,
                referralCode
            )
        );
        
        require(success, "Flash loan failed");
        
        for (uint256 i = 0; i < assets.length; i++) {
            emit FlashLoanExecuted(assets[i], amounts[i], 0, msg.sender);
        }
    }
    
    /**
     * @dev Callback executado pelo Aave após flash loan
     * @param assets Array de tokens emprestados
     * @param amounts Array de quantidades emprestadas
     * @param premiums Array de prêmios
     * @param initiator Iniciador do flash loan
     * @param params Parâmetros adicionais
     * @return Retorna true se bem-sucedido
     */
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        require(msg.sender == AAVE_POOL, "Caller must be Aave Pool");
        require(initiator == address(this), "Invalid initiator");
        
        // Decodificar dados de arbitragem
        ArbitrageData memory arbitrageData = abi.decode(params, (ArbitrageData));
        
        // Executar arbitragem
        uint256 profit = _executeArbitrage(arbitrageData);
        
        // Adicionar lucro ao mapeamento
        profits[arbitrageData.tokenA] += profit;
        
        emit ArbitrageExecuted(
            arbitrageData.tokenA,
            arbitrageData.tokenB,
            profit,
            arbitrageData.route
        );
        
        // Aprovar reembolso para Aave
        IERC20(assets[0]).approve(AAVE_POOL, amounts[0] + premiums[0]);
        
        return true;
    }
    
    /**
     * @dev Executa a lógica de arbitragem
     * @param data Dados da arbitragem
     * @return Lucro obtido
     */
    function _executeArbitrage(ArbitrageData memory data) internal returns (uint256) {
        uint256 balanceBefore = IERC20(data.tokenA).balanceOf(address(this));
        
        // Exemplo de lógica para rota direta
        if (keccak256(bytes(data.route)) == keccak256(bytes("uniswap->sushiswap"))) {
            // Swap Uniswap V3 (tokenA -> tokenB)
            uint256 amountOut1 = swapUniswapV3(UNISWAP_V3_ROUTER, data.tokenA, data.tokenB, data.amount, 1, 3000);
            // Swap SushiSwap (tokenB -> tokenA)
            swapUniswapV2(SUSHISWAP_ROUTER, data.tokenB, data.tokenA, amountOut1, 1);
        }
        // Adicionar outros casos de rota conforme necessário
        uint256 balanceAfter = IERC20(data.tokenA).balanceOf(address(this));
        return balanceAfter > balanceBefore ? balanceAfter - balanceBefore : 0;
    }
    
    /**
     * @dev Aprova tokens para os routers
     */
    function _approveTokens() internal {
        uint256 maxApproval = type(uint256).max;
        
        // Aprovar WMATIC
        IERC20(WMATIC).approve(UNISWAP_V3_ROUTER, maxApproval);
        IERC20(WMATIC).approve(SUSHISWAP_ROUTER, maxApproval);
        IERC20(WMATIC).approve(QUICKSWAP_ROUTER, maxApproval);
        
        // Aprovar USDC
        IERC20(USDC).approve(UNISWAP_V3_ROUTER, maxApproval);
        IERC20(USDC).approve(SUSHISWAP_ROUTER, maxApproval);
        IERC20(USDC).approve(QUICKSWAP_ROUTER, maxApproval);
        
        // Aprovar WETH
        IERC20(WETH).approve(UNISWAP_V3_ROUTER, maxApproval);
        IERC20(WETH).approve(SUSHISWAP_ROUTER, maxApproval);
        IERC20(WETH).approve(QUICKSWAP_ROUTER, maxApproval);
    }
    
    /**
     * @dev Permite ao owner sacar lucros
     * @param token Token para sacar
     * @param amount Quantidade para sacar
     * @param recipient Destinatário
     */
    function withdrawProfit(
        address token,
        uint256 amount,
        address recipient
    ) external onlyOwner {
        require(profits[token] >= amount, "Insufficient profit");
        require(recipient != address(0), "Invalid recipient");
        
        profits[token] -= amount;
        
        IERC20(token).transfer(recipient, amount);
        
        emit ProfitWithdrawn(token, amount, recipient);
    }
    
    /**
     * @dev Permite ao owner sacar ETH/MATIC
     * @param recipient Destinatário
     */
    function withdrawETH(address payable recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        
        recipient.transfer(balance);
    }
    
    /**
     * @dev Permite ao owner sacar tokens ERC-20
     * @param token Token para sacar
     * @param recipient Destinatário
     */
    function withdrawToken(address token, address recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        
        IERC20(token).transfer(recipient, balance);
    }
    
    /**
     * @dev Recebe ETH
     */
    receive() external payable {}
    
    /**
     * @dev Fallback function
     */
    fallback() external payable {}

    /**
     * @dev Inicia uma operação de arbitragem a partir do backend.
     * @param _tokenA O token inicial do flash loan e da arbitragem.
     * @param _amount A quantidade do token a ser emprestada e usada na arbitragem.
     * @param _path O caminho completo dos tokens para a arbitragem.
     */
    function initiateArbitrageFromBackend(
        address _tokenA,
        uint256 _amount,
        address[] calldata _path
    ) external nonReentrant {
        require(_path.length >= 2, "Path must have at least two tokens");

        // Codificar os dados da arbitragem
        bytes memory data = abi.encode(ArbitrageData({
            tokenA: _tokenA,
            tokenB: _path[1], // Segundo token do path como tokenB
            amount: _amount,
            route: "dynamic_route" // Placeholder para a rota
        }));

        // Chamar a função flashLoanSimple do Aave Pool
        flashLoanSimple(address(this), _tokenA, _amount, data, 0);
    }

    function swapUniswapV2(address router, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin) internal returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        IERC20(tokenIn).safeApprove(router, amountIn);
        uint[] memory amounts = IUniswapV2Router(router).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            address(this),
            block.timestamp
        );
        return amounts[amounts.length - 1];
    }

    function swapUniswapV3(address router, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, uint24 fee) internal returns (uint256) {
        IERC20(tokenIn).safeApprove(router, amountIn);
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0
        });
        return ISwapRouter(router).exactInputSingle(params);
    }
}