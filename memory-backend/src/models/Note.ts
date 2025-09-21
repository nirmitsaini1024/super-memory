export interface Note {
    id: string;
    text: string;
    source: 'note' | 'chat';
    timestamp: Date;
    tags?: string[];
}

export const validateNote = (req: any, res: any, next: any) => {
    const { text, tags } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({
            error: 'Text is required and must be a non-empty string'
        });
    }

    if (tags && (!Array.isArray(tags) || !tags.every(tag => typeof tag === 'string'))) {
        return res.status(400).json({
            error: 'Tags must be an array of strings'
        });
    }
    next();
};