# Excali Tool

[![Node.js CI](https://github.com/yubinTW/excali-tool/actions/workflows/node.js.yml/badge.svg)](https://github.com/yubinTW/excali-tool/actions/workflows/node.js.yml)
[![NPM version](https://img.shields.io/npm/v/excali-tool.svg?style=flat)](https://www.npmjs.com/package/excali-tool)

Some excalidraw function runs on Node.js. (Server Side)

## Install

https://www.npmjs.com/package/excali-tool

```
npm i excali-tool
```

## Usage

### convertToExcalidrawElements

```typescript
import { ExcalidrawElementSkeleton } from 'excali-tool/dist/data/transform'
import { convertToExcalidrawElements } from 'excali-tool'

const rawData: Array<ExcalidrawElementSkeleton> = [
    {
        type: 'text',
        x: 100,
        y: 100,
        text: 'Hello world',
        customData: {
            createdBy: 'user1'
        }
    }
]
const convertedElements = convertToExcalidrawElements(rawData)
console.log(convertedElements)
```