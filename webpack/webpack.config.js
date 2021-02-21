const path = require("path")
const webpack = require("webpack")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const FriendlyErrorsWebpackPlugin = require("friendly-errors-webpack-plugin")

module.exports = {
    entry: path.join(__dirname, "../src/index.tsx"),
    output: {
        path: path.join(__dirname, "../dist"),
        filename: "js/[name].[hash].js",
        publicPath: "/",
    },
    mode: "development",
    module: {
        rules: [
            {
                test: /\.(j|t)sx?$/, // 匹配js，ts
                use: ["babel-loader"],
            },
            {
                test: /\.css$/, // 匹配css
                use: ["style-loader", "css-loader"],
            },
            {
                test: /\.less$/, // 正则匹配css，less, 样式文件匹配 非依赖文件夹，
                use: [
                    // loader生效是从下往上的
                    "style-loader",
                    {
                        loader: "css-loader",
                        options: {
                            modules: {
                                localIdentName:
                                    "[path][name]__[local]--[hash:base64:6]",
                            },
                        },
                    },
                    "less-loader",
                ],
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
        // 热加载插件，用于启用局部模块热重载方便我们开发
        new webpack.HotModuleReplacementPlugin(),
        // 配置模板html位置
        new HtmlWebpackPlugin({
            filename: "index.html",
            template: "public/index.html",
            inject: true,
            favicon: "public/favicon.ico",
        }),
        // 优化webpack显示
        new FriendlyErrorsWebpackPlugin({
            // 清除控制台原有的信息
            clearConsole: true,
            // 打包成功之后在控制台给予开发者的提示
            compilationSuccessInfo: {
                messages: [
                    `开发环境启动成功，项目运行在: http://127.0.0.1:${5001}`,
                ],
            },
        }),
    ],
    resolve: {
        // 自动解析确定的扩展,import的时候可以不带后缀
        extensions: [".ts", ".tsx", ".js", ".jsx", ".d.ts"],
        // 别名
        alias: {
            "@": path.join(__dirname, "../src"),
            "react-simple": path.join(__dirname, "../src/react-simple"),
        },
    },
    // node 本地服务器配置
    devServer: {
        host: "0.0.0.0",
        port: 5001,
        historyApiFallback: true, // 该选项的作用所有的404都连接到index.html
        overlay: {
            //当出现编译器错误或警告时，就在网页上显示一层黑色的背景层和错误信息
            errors: true,
        },
        inline: true, // 模式
        hot: true, // 热加载
        open: true, // 打开页面
        useLocalIp: true, // 此选项允许浏览器使用本地 IP 打开
        publicPath: "/",
    },
}
